const bcrypt = require("bcrypt");
const express = require("express");
const multer = require("multer");
const router = express.Router();
const db = require("../db");
const crypto = require("crypto");
const {
  authRequired,
  boardRequired,
  isBoard,
  signToken,
  publicUser,
} = require("../middleware/auth");
const { sendWelcomePacket, sendClaimCodeEmail, sendHouseholdInvite, sendMail, sendPasswordReset } = require("../utils/mailer");
const { checkImageBuffer, checkImageDataUrl } = require("../utils/safetyFilter");
const { uploadToR2, deleteFromR2 } = require("../utils/s3Storage");
const { normalizeOccupancy } = require("../utils/occupancy");
const {
  saveTemplate,
  updateStamp,
  removeTemplate,
  listTemplates,
  buildDoorDropPdf,
  buildWelcomeAttachment,
} = require("../utils/printTemplates");

const USER_COLUMNS = `
  id, first_name, last_name, email, address, role,
  agreed_to_guidelines, profile_photo, password_hash
`;

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

async function occupancyForAddress(address) {
  if (!address) return null;
  const { rows } = await db.query(
    `SELECT occupancy FROM neighborhood_roster
      WHERE lower(trim(street_address)) = lower(trim($1))
      LIMIT 1`,
    [address],
  );
  return normalizeOccupancy(rows[0]?.occupancy);
}

async function toPublicUser(record) {
  const occupancy =
    record.occupancy !== undefined ? normalizeOccupancy(record.occupancy) : await occupancyForAddress(record.address);
  return publicUser({ ...record, occupancy });
}

function runPdfUpload(req, res, next) {
  pdfUpload.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "That PDF needs to be under 12MB." });
    }
    return res.status(400).json({ error: err.message || "Could not read that PDF." });
  });
}

async function welcomeAttachments({ firstName, streetAddress }) {
  try {
    const file = await buildWelcomeAttachment({ firstName, streetAddress });
    return file ? [file] : undefined;
  } catch (err) {
    console.error("Welcome packet attach skipped:", err.message);
    return undefined;
  }
}

function runAvatarUpload(req, res, next) {
  avatarUpload.single("photo")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Profile photos must be under 2MB." });
    }
    return res.status(400).json({ error: err.message || "Could not read that photo." });
  });
}

function newClaimCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function findLotByStreet(street) {
  const { rows } = await db.query(
    `SELECT * FROM neighborhood_roster
     WHERE lower(trim(street_address)) = lower(trim($1))
     LIMIT 1`,
    [street],
  );
  return rows[0] || null;
}

async function emailsForLotIds(ids) {
  if (!ids.length) return [];
  const { rows } = await db.query(
    `
    WITH lots AS (
      SELECT id, street_address, email, is_claimed
      FROM neighborhood_roster
      WHERE id = ANY($1::int[])
    )
    SELECT DISTINCT lower(trim(u.email)) AS email
    FROM users u
    JOIN lots l ON lower(trim(u.address)) = lower(trim(l.street_address))
    WHERE u.email IS NOT NULL AND trim(u.email) <> ''
    UNION
    SELECT DISTINCT lower(trim(l.email)) AS email
    FROM lots l
    WHERE l.email IS NOT NULL AND trim(l.email) <> ''
    `,
    [ids],
  );
  return rows.map((row) => row.email).filter(Boolean);
}

async function markClaimLetterSent(lotId) {
  await db.query(
    "UPDATE neighborhood_roster SET claim_letter_sent_at = CURRENT_TIMESTAMP WHERE id = $1",
    [lotId],
  );
}

async function sendClaimLetter(lot) {
  await sendClaimCodeEmail({
    to: lot.email,
    firstName: lot.first_name,
    streetAddress: lot.street_address,
    claimCode: lot.onboarding_token,
  });
  await markClaimLetterSent(lot.id);
}

async function emailsForClaimFilter(claimed) {
  const { rows } = await db.query(
    `
    WITH lots AS (
      SELECT street_address, email
      FROM neighborhood_roster
      WHERE ($1::boolean IS NULL) OR (COALESCE(is_claimed, false) = $1)
    )
    SELECT DISTINCT lower(trim(u.email)) AS email
    FROM users u
    JOIN lots l ON lower(trim(u.address)) = lower(trim(l.street_address))
    WHERE u.email IS NOT NULL AND trim(u.email) <> ''
    UNION
    SELECT DISTINCT lower(trim(l.email)) AS email
    FROM lots l
    WHERE l.email IS NOT NULL AND trim(l.email) <> ''
    `,
    [claimed],
  );
  return rows.map((row) => row.email).filter(Boolean);
}

function resolveRole(user) {
  if (user.role) return user.role;
  if (user.email === "admin@towncentralhoa.org") return "super_admin";
  return "resident";
}

async function persistRoleIfMissing(user, role) {
  if (!user.role && role) {
    await db.query("UPDATE users SET role = $1 WHERE id = $2", [role, user.id]);
  }
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const { rows } = await db.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE email = $1`,
      [email.trim().toLowerCase()],
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const record = rows[0];
    if (!record.password_hash) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const match = await bcrypt.compare(password, record.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const role = resolveRole(record);
    await persistRoleIfMissing(record, role);
    record.role = role;
    delete record.password_hash;

    const user = await toPublicUser(record);
    res.json({ success: true, token: signToken(user), user });
  } catch (err) {
    console.error("Login verification fault:", err.message);
    res.status(500).json({ error: "Server error during login processing." });
  }
});

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function validPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

router.put("/password", authRequired, async (req, res) => {
  const currentPassword = req.body.current_password || req.body.currentPassword;
  const newPassword = req.body.new_password || req.body.newPassword;

  if (!currentPassword || !validPassword(newPassword)) {
    return res.status(400).json({ error: "Enter your current password and a new password of at least 8 characters." });
  }

  try {
    const { rows } = await db.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [req.user.id],
    );
    const record = rows[0];
    if (!record?.password_hash) {
      return res.status(400).json({ error: "This account cannot change password yet." });
    }

    const match = await bcrypt.compare(currentPassword, record.password_hash);
    if (!match) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, req.user.id]);
    await db.query(
      "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL",
      [req.user.id],
    );
    res.json({ success: true, message: "Password updated." });
  } catch (err) {
    console.error("Password change error:", err.message);
    res.status(500).json({ error: "Could not update the password." });
  }
});

router.post("/password/forgot", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const generic = { success: true, message: "If that email is on an account, we sent a reset link." };

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    const { rows } = await db.query(
      `SELECT id, first_name, email FROM users WHERE lower(email) = $1`,
      [email],
    );
    const user = rows[0];
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      await db.query(
        "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL",
        [user.id],
      );
      await db.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
        [user.id, hashResetToken(token)],
      );
      const mailed = await sendPasswordReset({ to: user.email, firstName: user.first_name, token });
      if (mailed?.skipped) {
        console.log(`Password reset email skipped. Reset URL for ${user.email}: /reset/${token}`);
      }
    }
    res.json(generic);
  } catch (err) {
    console.error("Password forgot error:", err.message);
    res.json(generic);
  }
});

router.post("/password/reset", async (req, res) => {
  const token = String(req.body.token || "").trim();
  const newPassword = req.body.new_password || req.body.newPassword;

  if (!token || !validPassword(newPassword)) {
    return res.status(400).json({ error: "A valid reset link and a new password of at least 8 characters are required." });
  }

  try {
    const { rows } = await db.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > NOW()
       LIMIT 1`,
      [hashResetToken(token)],
    );
    const reset = rows[0];
    if (!reset) {
      return res.status(400).json({ error: "This reset link is invalid or has expired." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, reset.user_id]);
    await db.query(
      "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1",
      [reset.id],
    );
    res.json({ success: true, message: "Password updated. You can sign in now." });
  } catch (err) {
    console.error("Password reset error:", err.message);
    res.status(500).json({ error: "Could not reset the password." });
  }
});

router.get("/me", authRequired, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [req.user.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "User account not found." });
    }
    const record = rows[0];
    record.role = resolveRole(record);
    delete record.password_hash;
    res.json({ user: await toPublicUser(record) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/lookup", async (req, res) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: "Address query is required" });
  }

  try {
    const query = `
      SELECT id, street_address, first_name, last_name, is_claimed 
      FROM neighborhood_roster 
      WHERE street_address ILIKE $1
    `;
    const { rows } = await db.query(query, [`%${address.trim()}%`]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Address not found on the master neighborhood roster. Please check spelling or contact the board." });
    }

    const match = rows[0];

    if (match.is_claimed) {
      return res.status(400).json({
        error: "This household already has an account. Ask someone who lives there to invite you from Settings.",
      });
    }

    res.json({
      success: true,
      residentId: match.id,
      firstName: match.first_name,
      lastName: match.last_name,
      matchedAddress: match.street_address
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/claim", async (req, res) => {
  const { first_name, last_name, email, password, street_address, residentId, onboarding_token, occupancy } = req.body;
  const occupancyValue = normalizeOccupancy(occupancy);

  if (!residentId || !password || !email) {
    return res.status(400).json({ error: "Account details are required." });
  }
  if (!occupancyValue) {
    return res.status(400).json({ error: "Say whether this household owns or rents." });
  }

  try {
    await db.query("BEGIN");

    const lotRes = await db.query(
      `SELECT id, street_address, onboarding_token, is_claimed
       FROM neighborhood_roster
       WHERE id = $1
       FOR UPDATE`,
      [residentId],
    );
    const lot = lotRes.rows[0];
    if (!lot) {
      await db.query("ROLLBACK");
      return res.status(404).json({ error: "That lot is not on the roster." });
    }
    if (lot.is_claimed) {
      await db.query("ROLLBACK");
      return res.status(400).json({ error: "This household has already been claimed." });
    }
    if (
      onboarding_token &&
      String(lot.onboarding_token || "").trim().toUpperCase() !==
        String(onboarding_token).trim().toUpperCase()
    ) {
      await db.query("ROLLBACK");
      return res.status(400).json({ error: "Claim code does not match this lot." });
    }
    if (
      street_address &&
      lot.street_address.trim().toLowerCase() !== street_address.trim().toLowerCase()
    ) {
      await db.query("ROLLBACK");
      return res.status(400).json({ error: "Address does not match the claim code." });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const lotAddress = lot.street_address;

    const insertRes = await db.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, address, role, roster_lot_id)
       VALUES ($1, $2, $3, $4, $5, 'resident', $6)
       RETURNING ${USER_COLUMNS}`,
      [first_name, last_name, email.trim().toLowerCase(), hashedPassword, lotAddress, lot.id],
    );

    await db.query(
      "UPDATE neighborhood_roster SET is_claimed = true, first_name = $1, last_name = $2, email = $3, occupancy = $4 WHERE id = $5",
      [first_name, last_name, email.trim().toLowerCase(), occupancyValue, residentId],
    );

    await db.query("COMMIT");

    const record = insertRes.rows[0];
    delete record.password_hash;
    const user = await toPublicUser({ ...record, occupancy: occupancyValue });

    const lotStreet = lot.street_address;
    welcomeAttachments({ firstName: first_name, streetAddress: lotStreet })
      .then((attachments) => sendWelcomePacket({ to: email, firstName: first_name, attachments }))
      .then(async () => {
        await db.query(
          "UPDATE users SET welcome_letter_sent_at = CURRENT_TIMESTAMP WHERE email = $1",
          [email.trim().toLowerCase()],
        );
      })
      .catch((err) => {
        console.error("Welcome Packet Error:", err.message);
      });

    res.status(201).json({ success: true, token: signToken(user), user });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("Claim error:", err.message);
    res.status(500).json({ error: "Server error during claim." });
  }
});

router.post("/verify", async (req, res) => {
  const { street_address, onboarding_token } = req.body;

  try {
    const query = `
      SELECT id
      FROM neighborhood_roster
      WHERE street_address ILIKE $1
      AND upper(trim(onboarding_token)) = upper(trim($2))
      AND (is_claimed = false OR is_claimed IS NULL)
    `;
    const { rows } = await db.query(query, [street_address.trim(), onboarding_token.trim()]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Verification failed. Check address and token." });
    }

    res.status(200).json({ success: true, residentId: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function onboardProperty({ first_name, last_name, email, street_address, onboarding_token, send_welcome }) {
  const street = (street_address || "").trim();
  const existing = await findLotByStreet(street);
  if (existing) {
    const error = new Error("LOT_EXISTS");
    error.lot = existing;
    throw error;
  }

  const token = onboarding_token || newClaimCode();
  const insertQuery = `
    INSERT INTO neighborhood_roster (first_name, last_name, email, street_address, onboarding_token, is_claimed)
    VALUES ($1, $2, $3, $4, $5, false)
    RETURNING id, first_name, last_name, email, street_address, onboarding_token, is_claimed;
  `;
  let resident;
  try {
    const { rows } = await db.query(insertQuery, [
      (first_name || "").trim() || "Pending",
      (last_name || "").trim() || "Resident",
      email ? email.trim().toLowerCase() : null,
      street,
      token,
    ]);
    resident = rows[0];
  } catch (err) {
    if (err.code === "23505") {
      const collision = new Error("LOT_EXISTS");
      collision.lot = await findLotByStreet(street);
      throw collision;
    }
    throw err;
  }

  if (send_welcome && resident.email) {
    await sendClaimLetter(resident);
  }

  return resident;
}

function lotExistsPayload(lot) {
  return {
    error: "That street is already on the roster. Invite another household member onto the existing listing instead of adding a second one.",
    lot,
  };
}

router.post("/", boardRequired, async (req, res) => {
  const { first_name, last_name, email, street_address, onboarding_token, send_welcome } = req.body;

  if (!street_address) {
    return res.status(400).json({ error: "Street Address is required." });
  }

  try {
    const resident = await onboardProperty({
      first_name,
      last_name,
      email,
      street_address,
      onboarding_token,
      send_welcome,
    });
    res.status(201).json({ success: true, resident });
  } catch (err) {
    if (err.message === "LOT_EXISTS") {
      return res.status(409).json(lotExistsPayload(err.lot));
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/invite", authRequired, async (req, res) => {
  const { email, primary_resident_id, address } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    let targetAddress = req.user.address;
    const requested = (address || "").trim();
    if (requested && requested.toLowerCase() !== String(req.user.address || "").trim().toLowerCase()) {
      if (!isBoard(req.user)) {
        return res.status(403).json({ error: "You can only invite people to your own household." });
      }
      const lot = await findLotByStreet(requested);
      if (!lot) {
        return res.status(404).json({ error: "That street is not on the roster." });
      }
      targetAddress = lot.street_address;
    } else if (targetAddress) {
      const lot = await findLotByStreet(targetAddress);
      if (lot) targetAddress = lot.street_address;
    }

    if (!targetAddress) {
      return res.status(400).json({ error: "Household address is required." });
    }

    const inviteToken = crypto.randomBytes(16).toString("hex");
    await db.query(
      "INSERT INTO invitations (email, token, primary_resident_id, address) VALUES ($1, $2, $3, $4)",
      [email.trim().toLowerCase(), inviteToken, primary_resident_id || req.user.id, targetAddress],
    );

    await sendHouseholdInvite({
      to: email.trim().toLowerCase(),
      address: targetAddress,
      token: inviteToken,
    });

    res.status(201).json({ success: true, message: "Invitation sent!" });
  } catch (err) {
    console.error("Invite error:", err.message);
    res.status(500).json({ error: "Failed to generate invitation." });
  }
});

router.put("/avatar", authRequired, runAvatarUpload, async (req, res) => {
  const email = (req.body.email || req.user.email || "").trim().toLowerCase();

  if (email !== req.user.email && req.user.role !== "super_admin") {
    return res.status(403).json({ error: "You can only update your own avatar." });
  }

  try {
    let buffer;
    let mimeType = "image/jpeg";
    let filename = "avatar.jpg";

    if (req.file?.buffer) {
      buffer = req.file.buffer;
      mimeType = req.file.mimetype || mimeType;
      filename = req.file.originalname || filename;
    } else if (req.body.photoData) {
      const match = String(req.body.photoData).match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: "Photo data is required." });
      }
      mimeType = match[1];
      buffer = Buffer.from(match[2], "base64");
    } else {
      return res.status(400).json({ error: "Photo data is required." });
    }

    const photoCheck = await checkImageBuffer(buffer, mimeType, filename);
    if (!photoCheck.safe) {
      return res.status(400).json({ error: photoCheck.reason });
    }

    const previous = await db.query(
      "SELECT profile_photo FROM users WHERE lower(email) = $1",
      [email],
    );
    if (previous.rows.length === 0) {
      return res.status(404).json({ error: "Resident account not found." });
    }

    const publicUrl = await uploadToR2(buffer, filename, mimeType);
    const { rows } = await db.query(
      `UPDATE users
       SET profile_photo = $1
       WHERE lower(email) = $2
       RETURNING ${USER_COLUMNS}`,
      [publicUrl, email],
    );

    try {
      await deleteFromR2(previous.rows[0].profile_photo);
    } catch (err) {
      console.error("Old avatar cleanup warning:", err.message);
    }

    const record = rows[0];
    delete record.password_hash;
    const user = await toPublicUser(record);

    res.json({
      success: true,
      message: "Avatar updated successfully.",
      user,
    });
  } catch (err) {
    console.error("Error updating resident avatar:", err.message);
    res.status(500).json({ error: "Server error while saving avatar." });
  }
});

router.post("/admin-add", boardRequired, async (req, res) => {
  const { email, street_address, onboarding_token, first_name, last_name, send_welcome } = req.body;

  if (!street_address) {
    return res.status(400).json({ error: "Street Address is required." });
  }

  try {
    const resident = await onboardProperty({
      first_name,
      last_name,
      email,
      street_address,
      onboarding_token,
      send_welcome,
    });
    res.status(201).json({ success: true, resident });
  } catch (err) {
    if (err.message === "LOT_EXISTS") {
      return res.status(409).json(lotExistsPayload(err.lot));
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.get("/invite/:token", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT email, address FROM invitations WHERE token = $1 AND is_used = false",
      [req.params.token],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Invalid or expired token" });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error validating token." });
  }
});

router.post("/invite/accept", async (req, res) => {
  const { token, first_name, last_name, password } = req.body;

  try {
    await db.query("BEGIN");

    const inviteRes = await db.query(
      "SELECT email, address FROM invitations WHERE token = $1 AND is_used = false FOR UPDATE",
      [token],
    );

    if (inviteRes.rows.length === 0) {
      throw new Error("Token has already been used or is invalid.");
    }

    const { email, address } = inviteRes.rows[0];
    const lot = await findLotByStreet(address);
    const lotAddress = lot?.street_address || address;
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const insertRes = await db.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, address, role, roster_lot_id)
       VALUES ($1, $2, $3, $4, $5, 'resident', $6)
       RETURNING ${USER_COLUMNS}`,
      [first_name, last_name, email, hashedPassword, lotAddress, lot?.id || null],
    );

    await db.query("UPDATE invitations SET is_used = true WHERE token = $1", [token]);
    if (lot && !lot.is_claimed) {
      await db.query(
        "UPDATE neighborhood_roster SET is_claimed = true WHERE id = $1",
        [lot.id],
      );
    }
    await db.query("COMMIT");

    const record = insertRes.rows[0];
    delete record.password_hash;
    const user = await toPublicUser(record);

    res.status(201).json({ success: true, token: signToken(user), user });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("Invite accept error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/account/:id", boardRequired, async (req, res) => {
  const userId = req.params.id;

  try {
    await db.query("BEGIN");

    const userRes = await db.query("SELECT address FROM users WHERE id = $1", [userId]);

    if (userRes.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ error: "User account not found." });
    }

    const userAddress = userRes.rows[0].address;

    await db.query("DELETE FROM users WHERE id = $1", [userId]);

    const countRes = await db.query(
      "SELECT COUNT(*) FROM users WHERE lower(trim(address)) = lower(trim($1))",
      [userAddress],
    );

    const remainingResidents = parseInt(countRes.rows[0].count, 10);

    let propertyUnclaimed = false;
    if (remainingResidents === 0) {
      await db.query(
        "UPDATE neighborhood_roster SET is_claimed = false, occupancy = NULL WHERE lower(trim(street_address)) = lower(trim($1))",
        [userAddress],
      );
      propertyUnclaimed = true;
    }

    await db.query("COMMIT");

    res.json({
      success: true,
      message: "User account deleted successfully.",
      propertyUnclaimed,
      remainingResidents,
    });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("Safeguard deletion error:", err.message);
    res.status(500).json({ error: "Server error during account deletion process." });
  }
});

router.get("/master-list-placeholder", boardRequired, async (_req, res) => {
  try {
    const query = `
      SELECT
        r.id,
        r.first_name,
        r.last_name,
        r.email,
        r.street_address,
        r.is_claimed,
        r.occupancy,
        r.onboarding_token,
        r.claim_letter_sent_at,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', u.id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'email', u.email,
            'role', COALESCE(u.role, 'resident'),
            'welcome_letter_sent_at', u.welcome_letter_sent_at
          ) ORDER BY u.last_name, u.first_name)
          FROM users u
          WHERE lower(trim(u.address)) = lower(trim(r.street_address))
        ), '[]'::json) AS household
      FROM neighborhood_roster r
      ORDER BY r.street_address ASC, r.last_name ASC, r.first_name ASC;
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (err) {
    console.error("Roster autocomplete query error:", err.message);
    res.status(500).json({ error: "Server error retrieving master directory index parameters." });
  }
});

function truthyFlag(value) {
  return ["true", "1", "yes", "y"].includes(String(value || "").trim().toLowerCase());
}

router.post("/lots/bulk-import", boardRequired, async (req, res) => {
  const rows = Array.isArray(req.body.lots) ? req.body.lots : [];
  const sendClaimDefault = Boolean(req.body.send_claim);
  if (!rows.length) {
    return res.status(400).json({ error: "No lots to import." });
  }
  if (rows.length > 400) {
    return res.status(400).json({ error: "Import up to 400 lots at a time." });
  }

  const created = [];
  const skipped = [];
  const failed = [];
  const seen = new Set();

  for (const row of rows) {
    const street = String(row?.street_address || "").trim();
    if (!street) {
      failed.push({ street_address: "", reason: "missing_street" });
      continue;
    }

    const key = street.toLowerCase();
    if (seen.has(key)) {
      skipped.push({ street_address: street, reason: "duplicate_in_file" });
      continue;
    }
    seen.add(key);

    const email = row.email ? String(row.email).trim().toLowerCase() : "";
    if (email && !email.includes("@")) {
      failed.push({ street_address: street, reason: "bad_email" });
      continue;
    }

    try {
      const send_welcome = Boolean(email) && (sendClaimDefault || truthyFlag(row.send_claim));
      const resident = await onboardProperty({
        street_address: street,
        first_name: row.first_name,
        last_name: row.last_name,
        email: email || null,
        send_welcome,
      });
      created.push({
        street_address: resident.street_address,
        claim_code: resident.onboarding_token,
        emailed: send_welcome,
      });
    } catch (err) {
      if (err.message === "LOT_EXISTS") {
        skipped.push({ street_address: street, reason: "already_on_roster" });
      } else {
        console.error("Bulk import row error:", err.message);
        failed.push({ street_address: street, reason: "failed" });
      }
    }
  }

  res.json({
    success: true,
    created: created.length,
    skipped,
    failed,
    lots: created,
    message: created.length
      ? `Added ${created.length} lot${created.length === 1 ? "" : "s"}.`
      : "No new lots were added.",
  });
});

router.post("/lots/bulk-claim-letters", boardRequired, async (req, res) => {
  const ids = (req.body.ids || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
  if (!ids.length) {
    return res.status(400).json({ error: "Select households first." });
  }

  try {
    const { rows } = await db.query(
      `SELECT id, first_name, last_name, email, street_address, onboarding_token, is_claimed
       FROM neighborhood_roster
       WHERE id = ANY($1::int[])`,
      [ids],
    );

    const sent = [];
    const skipped = [];
    for (const lot of rows) {
      if (lot.is_claimed) {
        skipped.push({ street_address: lot.street_address, reason: "already_claimed" });
        continue;
      }
      if (!lot.email || !lot.onboarding_token) {
        skipped.push({ street_address: lot.street_address, reason: "no_email" });
        continue;
      }
      await sendClaimLetter(lot);
      sent.push(lot.street_address);
    }

    res.json({
      success: true,
      sent: sent.length,
      skipped,
      message: sent.length
        ? `Claim letters sent to ${sent.length} household${sent.length === 1 ? "" : "s"}.`
        : "No claim letters sent. Download the CSV for streets without email.",
    });
  } catch (err) {
    console.error("Bulk claim letter error:", err.message);
    res.status(500).json({ error: "Could not send those claim letters." });
  }
});

router.post("/lots/bulk-welcome", boardRequired, async (req, res) => {
  const ids = (req.body.ids || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
  const selectedEmails = [...new Set(
    (req.body.emails || [])
      .map((item) => String(item || "").trim().toLowerCase())
      .filter((item) => item.includes("@")),
  )];
  const force = Boolean(req.body.force);

  if (!ids.length && !selectedEmails.length) {
    return res.status(400).json({ error: "Select households or people first." });
  }

  try {
    const { rows } = await db.query(
      `
      SELECT DISTINCT ON (lower(trim(u.email)))
        u.id, u.first_name, u.email, u.welcome_letter_sent_at, u.address
      FROM users u
      WHERE u.email IS NOT NULL AND trim(u.email) <> ''
        AND (
          (${ids.length} > 0 AND lower(trim(u.address)) IN (
            SELECT lower(trim(street_address)) FROM neighborhood_roster WHERE id = ANY($1::int[])
          ))
          OR (${selectedEmails.length} > 0 AND lower(trim(u.email)) = ANY($2::text[]))
        )
      ORDER BY lower(trim(u.email)), u.id
      `,
      [ids, selectedEmails],
    );

    if (!rows.length) {
      return res.status(400).json({ error: "No portal logins with email on that selection." });
    }

    const previouslySent = rows
      .filter((row) => row.welcome_letter_sent_at)
      .map((row) => ({
        email: row.email,
        name: row.first_name,
        sent_at: row.welcome_letter_sent_at,
      }));

    if (previouslySent.length && !force) {
      return res.json({
        success: false,
        needsConfirm: true,
        previouslySent,
        recipients: rows.length,
        message: `${previouslySent.length} of ${rows.length} already received a welcome letter. Send again?`,
      });
    }

    const sent = [];
    for (const user of rows) {
      await sendWelcomePacket({
        to: user.email,
        firstName: user.first_name,
        attachments: await welcomeAttachments({
          firstName: user.first_name,
          streetAddress: user.address,
        }),
      });
      await db.query(
        "UPDATE users SET welcome_letter_sent_at = CURRENT_TIMESTAMP WHERE id = $1",
        [user.id],
      );
      sent.push(user.email);
    }

    res.json({
      success: true,
      sent: sent.length,
      previouslySent,
      message: `Welcome letters sent to ${sent.length} ${sent.length === 1 ? "person" : "people"}.`,
    });
  } catch (err) {
    console.error("Bulk welcome error:", err.message);
    res.status(500).json({ error: "Could not send those welcome letters." });
  }
});

router.post("/lots/:id/resend-claim", boardRequired, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, first_name, last_name, email, street_address, onboarding_token, is_claimed
       FROM neighborhood_roster WHERE id = $1`,
      [req.params.id],
    );
    const lot = rows[0];
    if (!lot) return res.status(404).json({ error: "That lot is not on the roster." });
    if (!lot.email) {
      return res.status(400).json({ error: "Add an email on this lot before sending a claim letter." });
    }

    await sendClaimLetter(lot);
    res.json({ success: true, message: "Claim letter sent." });
  } catch (err) {
    console.error("Resend claim error:", err.message);
    res.status(500).json({ error: "Could not send the claim letter." });
  }
});

router.post("/lots/:id/transfer", boardRequired, async (req, res) => {
  const { first_name, last_name, email, send_welcome } = req.body;
  if (!first_name || !last_name) {
    return res.status(400).json({ error: "New occupant first and last name are required." });
  }

  try {
    const { rows } = await db.query(
      "SELECT * FROM neighborhood_roster WHERE id = $1",
      [req.params.id],
    );
    const lot = rows[0];
    if (!lot) return res.status(404).json({ error: "That lot is not on the roster." });

    const token = newClaimCode();
    const nextEmail = email ? email.trim().toLowerCase() : null;
    const { rows: updated } = await db.query(
      `UPDATE neighborhood_roster
       SET first_name = $1,
           last_name = $2,
           email = $3,
           onboarding_token = $4,
           is_claimed = false,
           occupancy = NULL
       WHERE id = $5
       RETURNING id, first_name, last_name, email, street_address, onboarding_token, is_claimed`,
      [first_name.trim(), last_name.trim(), nextEmail, token, lot.id],
    );

    const resident = updated[0];
    const { rows: household } = await db.query(
      `SELECT id, first_name, last_name, email, role
       FROM users
       WHERE lower(trim(address)) = lower(trim($1))
       ORDER BY last_name, first_name`,
      [resident.street_address],
    );

    if (send_welcome && resident.email) {
      await sendClaimLetter(resident);
    }

    res.json({
      success: true,
      resident,
      household,
      message: household.length
        ? "Owner transferred. Existing logins at this address still have access until you remove them."
        : "Owner transferred. A new claim code is ready.",
    });
  } catch (err) {
    console.error("Transfer error:", err.message);
    res.status(500).json({ error: "Could not transfer this lot." });
  }
});

router.patch("/lots/:id/occupancy", boardRequired, async (req, res) => {
  const occupancy = normalizeOccupancy(req.body.occupancy);
  if (!occupancy) {
    return res.status(400).json({ error: "Choose owner or renter." });
  }
  try {
    const { rows } = await db.query(
      `UPDATE neighborhood_roster SET occupancy = $1 WHERE id = $2
       RETURNING id, street_address, occupancy`,
      [occupancy, req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: "That lot is not on the roster." });
    res.json(rows[0]);
  } catch (err) {
    console.error("Occupancy update error:", err.message);
    res.status(500).json({ error: "Could not update occupancy." });
  }
});

router.post("/broadcast", boardRequired, async (req, res) => {
  const { targetType, selectedEmails, selectedIds, subject, message, kind } = req.body;

  if (!subject || !message || !targetType) {
    return res.status(400).json({ error: "Target type, subject, and message are required fields." });
  }

  try {
    let emailList = [];

    if (targetType === "people") {
      emailList = [...new Set(
        (selectedEmails || [])
          .map((item) => String(item || "").trim().toLowerCase())
          .filter((item) => item.includes("@")),
      )];
    } else if (targetType === "selected") {
      let ids = (selectedIds || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
      if (!ids.length && Array.isArray(selectedEmails) && selectedEmails.length) {
        const { rows } = await db.query(
          `SELECT id FROM neighborhood_roster
           WHERE email IS NOT NULL AND lower(trim(email)) = ANY($1::text[])`,
          [selectedEmails.map((item) => String(item).trim().toLowerCase())],
        );
        ids = rows.map((row) => row.id);
      }
      emailList = await emailsForLotIds(ids);
    } else if (targetType === "all") {
      emailList = await emailsForClaimFilter(null);
    } else if (targetType === "unclaimed") {
      emailList = await emailsForClaimFilter(false);
    } else if (targetType === "claimed") {
      emailList = await emailsForClaimFilter(true);
    }

    if (emailList.length === 0) {
      return res.status(404).json({ error: "No valid recipient email addresses found for this selection." });
    }

    const prefix = kind === "newsletter" ? "[Town Central Newsletter]" : "[Town Central Board Broadcast]";
    await sendMail({
      to: process.env.EMAIL_USER,
      bcc: emailList,
      subject: `${prefix} ${subject}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h3 style="color: #2c3e50; margin-top: 0;">Official Neighborhood Communication</h3>
          <p style="color: #475569; font-size: 1rem; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          <p style="font-size: 0.75rem; color: #94a3b8; text-align: center;">Town Central HOA Executive Board</p>
        </div>
      `,
    });
    res.json({ success: true, count: emailList.length, message: `Broadcast successfully sent to ${emailList.length} recipient(s).` });
  } catch (err) {
    console.error("Broadcast transmission fault:", err.message);
    res.status(500).json({ error: "Server error while dispatching broadcast emails." });
  }
});

router.post("/agree-guidelines", authRequired, async (req, res) => {
  try {
    const query = `
      UPDATE users 
      SET agreed_to_guidelines = true, 
          agreed_to_guidelines_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING email, agreed_to_guidelines;
    `;
    const { rows } = await db.query(query, [req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "User account not found." });
    }

    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error("Guidelines agreement error:", err.message);
    res.status(500).json({ error: "Server error while saving guidelines status." });
  }
});

router.get("/print-templates", boardRequired, async (_req, res) => {
  try {
    const templates = await listTemplates();
    res.json({ templates });
  } catch (err) {
    console.error("Print templates list error:", err.message);
    res.status(500).json({ error: "Could not load print templates." });
  }
});

router.post("/print-templates/:kind", boardRequired, runPdfUpload, async (req, res) => {
  if (!req.file?.buffer) {
    return res.status(400).json({ error: "Choose a PDF." });
  }
  const mime = req.file.mimetype || "";
  if (mime && mime !== "application/pdf" && mime !== "application/x-pdf") {
    return res.status(400).json({ error: "Upload a PDF." });
  }
  try {
    const template = await saveTemplate({
      kind: req.params.kind,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: "application/pdf",
      user: req.user,
    });
    res.json(template);
  } catch (err) {
    console.error("Print template upload error:", err.message);
    res.status(400).json({ error: err.message || "Could not save that PDF." });
  }
});

router.patch("/print-templates/:kind", boardRequired, async (req, res) => {
  try {
    const template = await updateStamp(req.params.kind, req.body.stamp || req.body, req.user);
    res.json(template);
  } catch (err) {
    console.error("Print template stamp error:", err.message);
    res.status(400).json({ error: err.message || "Could not update that template." });
  }
});

router.delete("/print-templates/:kind", boardRequired, async (req, res) => {
  try {
    await removeTemplate(req.params.kind);
    res.json({ success: true });
  } catch (err) {
    console.error("Print template delete error:", err.message);
    res.status(500).json({ error: "Could not remove that PDF." });
  }
});

router.post("/lots/door-drop-pdf", boardRequired, async (req, res) => {
  const ids = (req.body.ids || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
  if (!ids.length) {
    return res.status(400).json({ error: "Select unclaimed lots first." });
  }
  if (ids.length > 200) {
    return res.status(400).json({ error: "Print up to 200 flyers at a time." });
  }
  try {
    const { rows } = await db.query(
      `SELECT id, street_address, first_name, last_name, onboarding_token, is_claimed
       FROM neighborhood_roster
       WHERE id = ANY($1::int[])
       ORDER BY street_address`,
      [ids],
    );
    const lots = rows.filter((lot) => !lot.is_claimed && lot.onboarding_token);
    if (!lots.length) {
      return res.status(400).json({ error: "Select unclaimed lots that have a claim code." });
    }
    const pdf = await buildDoorDropPdf(lots);
    if (!pdf) {
      return res.status(204).end();
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      lots.length === 1
        ? `attachment; filename="town-central-door-drop.pdf"`
        : `attachment; filename="town-central-door-drop-${lots.length}-lots.pdf"`,
    );
    res.send(pdf);
  } catch (err) {
    console.error("Door-drop PDF error:", err.message);
    res.status(500).json({ error: "Could not build those flyers." });
  }
});

module.exports = router;
