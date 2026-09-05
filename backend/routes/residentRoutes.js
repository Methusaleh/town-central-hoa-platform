const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();
const db = require("../db");
const crypto = require("crypto");
const {
  authRequired,
  boardRequired,
  signToken,
  publicUser,
} = require("../middleware/auth");
const { sendWelcomePacket, sendClaimCodeEmail, sendHouseholdInvite, sendMail } = require("../utils/mailer");

const USER_COLUMNS = `
  id, first_name, last_name, email, address, role,
  agreed_to_guidelines, profile_photo, password_hash
`;

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

    const user = publicUser(record);
    res.json({ success: true, token: signToken(user), user });
  } catch (err) {
    console.error("Login verification fault:", err.message);
    res.status(500).json({ error: "Server error during login processing." });
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
    res.json({ user: publicUser(record) });
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
      return res.status(400).json({ error: "This property profile has already been claimed and registered." });
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
  const { first_name, last_name, email, password, street_address, residentId } = req.body;

  try {
    await db.query("BEGIN");

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const insertRes = await db.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, address, role)
       VALUES ($1, $2, $3, $4, $5, 'resident')
       RETURNING ${USER_COLUMNS}`,
      [first_name, last_name, email.trim().toLowerCase(), hashedPassword, street_address],
    );

    await db.query(
      "UPDATE neighborhood_roster SET is_claimed = true, first_name = $1, last_name = $2, email = $3 WHERE id = $4 RETURNING id",
      [first_name, last_name, email.trim().toLowerCase(), residentId],
    );

    await db.query("COMMIT");

    const record = insertRes.rows[0];
    delete record.password_hash;
    const user = publicUser(record);

    sendWelcomePacket({ to: email, firstName: first_name }).catch((err) => {
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
      AND onboarding_token = $2 
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
  const token = onboarding_token || Math.random().toString(36).substring(2, 8).toUpperCase();
  const insertQuery = `
    INSERT INTO neighborhood_roster (first_name, last_name, email, street_address, onboarding_token, is_claimed)
    VALUES ($1, $2, $3, $4, $5, false)
    RETURNING id, first_name, last_name, email, street_address, onboarding_token, is_claimed;
  `;
  const { rows } = await db.query(insertQuery, [
    (first_name || "Pending").trim(),
    (last_name || "Resident").trim(),
    email ? email.trim().toLowerCase() : null,
    street_address.trim(),
    token,
  ]);

  const resident = rows[0];
  if (send_welcome && resident.email) {
    await sendClaimCodeEmail({
      to: resident.email,
      firstName: resident.first_name,
      streetAddress: resident.street_address,
      claimCode: resident.onboarding_token,
    });
  }

  return resident;
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
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/invite", authRequired, async (req, res) => {
  const { email, primary_resident_id, address } = req.body;
  const inviteToken = crypto.randomBytes(16).toString("hex");

  try {
    await db.query(
      "INSERT INTO invitations (email, token, primary_resident_id, address) VALUES ($1, $2, $3, $4)",
      [email, inviteToken, primary_resident_id || req.user.id, address || req.user.address],
    );

    await sendHouseholdInvite({
      to: email,
      address: address || req.user.address,
      token: inviteToken,
    });

    res.status(201).json({ success: true, message: "Invitation sent!" });
  } catch (err) {
    console.error("Invite error:", err.message);
    res.status(500).json({ error: "Failed to generate invitation." });
  }
});

router.put("/avatar", authRequired, async (req, res) => {
  const { photoData } = req.body;
  const email = req.body.email || req.user.email;

  if (!photoData) {
    return res.status(400).json({ error: "Photo data is required." });
  }

  if (email.trim().toLowerCase() !== req.user.email && req.user.role !== "super_admin") {
    return res.status(403).json({ error: "You can only update your own avatar." });
  }

  try {
    const { rows } = await db.query(
      `UPDATE users
       SET profile_photo = $1
       WHERE email = $2
       RETURNING ${USER_COLUMNS}`,
      [photoData, email.trim().toLowerCase()],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Resident account not found." });
    }

    const record = rows[0];
    delete record.password_hash;
    const user = publicUser(record);

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
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const insertRes = await db.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, address, role)
       VALUES ($1, $2, $3, $4, $5, 'resident')
       RETURNING ${USER_COLUMNS}`,
      [first_name, last_name, email, hashedPassword, address],
    );

    await db.query("UPDATE invitations SET is_used = true WHERE token = $1", [token]);
    await db.query("COMMIT");

    const record = insertRes.rows[0];
    delete record.password_hash;
    const user = publicUser(record);

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
      "SELECT COUNT(*) FROM users WHERE address = $1",
      [userAddress],
    );

    const remainingResidents = parseInt(countRes.rows[0].count, 10);

    let propertyUnclaimed = false;
    if (remainingResidents === 0) {
      await db.query(
        "UPDATE neighborhood_roster SET is_claimed = false WHERE street_address = $1",
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
      SELECT id, first_name, last_name, email, street_address, lot_number, is_claimed 
      FROM neighborhood_roster 
      ORDER BY last_name ASC, first_name ASC;
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (err) {
    console.error("Roster autocomplete query error:", err.message);
    res.status(500).json({ error: "Server error retrieving master directory index parameters." });
  }
});

router.post("/broadcast", boardRequired, async (req, res) => {
  const { targetType, selectedEmails, subject, message } = req.body;

  if (!subject || !message || !targetType) {
    return res.status(400).json({ error: "Target type, subject, and message are required fields." });
  }

  try {
    let emailList = [];

    if (targetType === "selected") {
      emailList = (selectedEmails || []).filter((e) => e && e.includes("@"));
    } else if (targetType === "all") {
      const { rows } = await db.query("SELECT DISTINCT email FROM neighborhood_roster WHERE email IS NOT NULL AND email != ''");
      emailList = rows.map((r) => r.email);
    } else if (targetType === "unclaimed") {
      const { rows } = await db.query("SELECT email FROM neighborhood_roster WHERE is_claimed = false AND email IS NOT NULL AND email != ''");
      emailList = rows.map((r) => r.email);
    } else if (targetType === "claimed") {
      const { rows } = await db.query("SELECT email FROM neighborhood_roster WHERE is_claimed = true AND email IS NOT NULL AND email != ''");
      emailList = rows.map((r) => r.email);
    }

    if (emailList.length === 0) {
      return res.status(404).json({ error: "No valid recipient email addresses found for this selection." });
    }

    await sendMail({
      to: process.env.EMAIL_USER,
      bcc: emailList,
      subject: `[Town Central Board Broadcast] ${subject}`,
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

module.exports = router;
