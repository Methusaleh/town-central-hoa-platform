const express = require("express");
const router = express.Router();
const db = require("../db");

// POST /api/residents/lookup - Search the master roster by exact or partial address
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

// POST /api/claim - Finalizes account creation and claims the roster profile
router.post("/claim", async (req, res) => {
  const { first_name, last_name, email, password, street_address, residentId } = req.body;

  try {
    await db.query("BEGIN");

    // 1. Create the user account
    await db.query(
      `INSERT INTO users (first_name, last_name, email, password, address) VALUES ($1, $2, $3, $4, $5)`,
      [first_name, last_name, email, password, street_address]
    );

    // 2. Mark roster as claimed
    const { rows } = await db.query(
      "UPDATE neighborhood_roster SET is_claimed = true, first_name = $1, last_name = $2 WHERE id = $3 RETURNING id",
      [first_name, last_name, residentId]
    );

    // 3. TRIGGER WELCOME PACKET HERE
    const mailOptions = {
        from: `"Town Central Executive Board" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Welcome to Town Central, ${first_name}! 🏡`,
        html: `<!-- Your existing Welcome Packet HTML code here -->`
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) console.error("Welcome Packet Error:", err);
    });

    await db.query("COMMIT");
    res.status(201).json({ success: true });
  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ error: "Server error during claim." });
  }
});

// POST /api/residents/verify
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

// POST /api/residents/invite - Generate invitation for secondary member
router.post("/invite", async (req, res) => {
  const { email, primary_resident_id, address } = req.body;
  const inviteToken = crypto.randomBytes(16).toString("hex");

  try {
    // 1. Save the token to an invitations table
    await db.query(
      "INSERT INTO invitations (email, token, primary_resident_id, address) VALUES ($1, $2, $3, $4)",
      [email, inviteToken, primary_resident_id, address]
    );

    // 2. Send the email with the link containing the token
    // (We can use your existing nodemailer setup from requestRoutes.js)[cite: 3]
    res.status(201).json({ success: true, message: "Invitation sent!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate invitation." });
  }
});

// PUT /api/residents/avatar - Update a resident's profile photo
router.put("/avatar", async (req, res) => {
  const { email, photoData } = req.body;

  if (!email || !photoData) {
    return res.status(400).json({ error: "Email and photo data are required fields." });
  }

  try {
    const query = `
      UPDATE neighborhood_roster 
      SET profile_photo = $1 
      WHERE email = $2 
      RETURNING id, street_address, first_name, profile_photo;
    `;
    const { rows } = await db.query(query, [photoData, email.trim()]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Resident account not found." });
    }

    res.json({
      success: true,
      message: "Avatar updated successfully.",
      user: rows[0]
    });
  } catch (err) {
    console.error("Error updating resident avatar:", err.message);
    res.status(500).json({ error: "Server error while saving avatar." });
  }
});

// Updated POST /api/residents/admin-add inside residentRoutes.js
router.post("/admin-add", async (req, res) => {
  const { email, street_address } = req.body;

  if (!street_address) {
    return res.status(400).json({ error: "Street Address is required." });
  }

  try {
    const insertQuery = `
      INSERT INTO neighborhood_roster (first_name, last_name, email, street_address, is_claimed)
      VALUES ('Pending', 'Resident', $1, $2, false)
      RETURNING id, street_address;
    `;
    const { rows } = await db.query(insertQuery, [
      email ? email.trim().toLowerCase() : null,
      street_address.trim()
    ]);

    res.status(201).json({ success: true, resident: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// GET /api/residents/invite/:token - Verifies the token on page load
router.get("/invite/:token", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT email, address FROM invitations WHERE token = $1 AND is_used = false",
      [req.params.token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Invalid or expired token" });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error validating token." });
  }
});

// POST /api/residents/invite/accept - Finalizes the secondary account creation
router.post("/invite/accept", async (req, res) => {
  const { token, first_name, last_name, password } = req.body;

  try {
    await db.query("BEGIN");
    
    // 1. Lock the invitation row for update to prevent race conditions
    const inviteRes = await db.query(
      "SELECT email, address FROM invitations WHERE token = $1 AND is_used = false FOR UPDATE",
      [token]
    );

    if (inviteRes.rows.length === 0) {
      throw new Error("Token has already been used or is invalid.");
    }
    
    const { email, address } = inviteRes.rows[0];

    // 2. Create the new user attached to the primary resident's address
    await db.query(
      "INSERT INTO users (first_name, last_name, email, password, address) VALUES ($1, $2, $3, $4, $5)",
      [first_name, last_name, email, password, address]
    );

    // 3. Mark the invitation as used
    await db.query("UPDATE invitations SET is_used = true WHERE token = $1", [token]);
    
    await db.query("COMMIT");
    res.status(201).json({ success: true });
  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/residents/account/:id - Admin tool to delete a user account safely
router.delete("/account/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    await db.query("BEGIN");

    // 1. Grab the user's address BEFORE we delete them
    const userRes = await db.query("SELECT address FROM users WHERE id = $1", [userId]);
    
    if (userRes.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ error: "User account not found." });
    }
    
    const userAddress = userRes.rows[0].address;

    // 2. Delete the actual user record
    await db.query("DELETE FROM users WHERE id = $1", [userId]);

    // 3. Count how many users still share this exact address string
    const countRes = await db.query(
      "SELECT COUNT(*) FROM users WHERE address = $1", 
      [userAddress]
    );
    
    const remainingResidents = parseInt(countRes.rows[0].count, 10);

    // 4. THE SAFEGUARD: If the house is completely empty, unclaim the property
    let propertyUnclaimed = false;
    if (remainingResidents === 0) {
      await db.query(
        "UPDATE neighborhood_roster SET is_claimed = false WHERE street_address = $1",
        [userAddress]
      );
      propertyUnclaimed = true;
    }

    await db.query("COMMIT");

    res.json({ 
      success: true, 
      message: "User account deleted successfully.",
      propertyUnclaimed: propertyUnclaimed,
      remainingResidents: remainingResidents
    });

  } catch (err) {
    await db.query("ROLLBACK");
    console.error("Safeguard deletion error:", err.message);
    res.status(500).json({ error: "Server error during account deletion process." });
  }
});

// --- ADDED FOR AUTOCOMPLETE: Fetch true directory indexing for administrative subcomponents ---
router.get("/master-list-placeholder", async (req, res) => {
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

module.exports = router;