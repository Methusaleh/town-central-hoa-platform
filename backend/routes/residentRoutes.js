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
    // Start a transaction so if one part fails, neither happens
    await db.query("BEGIN");

    // 1. Create the user account
    // Note: You should be hashing your passwords before storing them!
    const userQuery = `
      INSERT INTO users (first_name, last_name, email, password, address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `;
    await db.query(userQuery, [first_name, last_name, email, password, street_address]);

    // 2. Mark the roster entry as claimed (Your old logic!)
    const rosterQuery = `
      UPDATE neighborhood_roster 
      SET is_claimed = true 
      WHERE id = $1 
      RETURNING id, street_address;
    `;
    const { rows } = await db.query(rosterQuery, [residentId]);

    if (rows.length === 0) {
      throw new Error("Resident roster record not found.");
    }

    await db.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Account created and profile claimed successfully.",
      updatedRecord: rows[0]
    });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("Claim process error:", err.message);
    res.status(500).json({ error: "Server error during account claim process." });
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
  const { first_name, last_name, email, street_address, sendWelcomePacket } = req.body;

  if (!first_name || !last_name || !street_address) {
    return res.status(400).json({ error: "First Name, Last Name, and Street Address are required fields." });
  }

  try {
    if (email && email.trim() !== "") {
      const checkEmail = await db.query("SELECT id FROM neighborhood_roster WHERE email = $1", [email.trim().toLowerCase()]);
      if (checkEmail.rows.length > 0) {
        return res.status(400).json({ error: "A resident with this email address already exists." });
      }
    }

    const insertQuery = `
      INSERT INTO neighborhood_roster (first_name, last_name, email, street_address, is_claimed)
      VALUES ($1, $2, $3, $4, false)
      RETURNING id, first_name, last_name, email, street_address, is_claimed;
    `;
    
    const { rows } = await db.query(insertQuery, [
      first_name.trim(),
      last_name.trim(),
      email && email.trim() !== "" ? email.trim().toLowerCase() : null,
      street_address.trim()
    ]);

    const newResident = rows[0];

    // AUTOMATED WELCOME PACKET DISPATCH
    if (sendWelcomePacket && email && email.trim() !== "") {
      const mailOptions = {
        from: `"Town Central Executive Board" <${process.env.EMAIL_USER}>`,
        to: email.trim(),
        subject: `Welcome to Town Central, ${first_name}! 🏡`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #2c3e50; padding: 20px; text-align: center; color: white;">
              <h2>Welcome to the Neighborhood!</h2>
            </div>
            <div style="padding: 24px; color: #334155; line-height: 1.6;">
              <p>Hi ${first_name},</p>
              <p>Congratulations on your new home! The Town Central HOA Executive Board is thrilled to welcome you to our community.</p>
              <p>To help you get settled, we have generated your official neighborhood digital onboarding packet. This contains pool keys instructions, trash schedules, and architectural guidelines.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://town-central-hoa-platform.vercel.app/public-docs/Welcome_Packet_2026.pdf" style="background-color: #2ecc71; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px;">📥 Download Welcome Packet</a>
              </div>
              
              <p>Once you are ready, please visit the portal to claim your profile and set up your secure resident login credentials.</p>
            </div>
          </div>
        `
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.error("Welcome Packet Delivery Fault:", err.message);
        else console.log("Welcome Packet sent successfully:", info.response);
      });
    }

    res.status(201).json({ success: true, resident: newResident });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error creating resident record." });
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

// --- ADDED FOR AUTOCOMPLETE: Fetch true directory indexing for administrative subcomponents ---
router.get("/master-list-placeholder", async (req, res) => {
  try {
    const query = `
      SELECT id, first_name, last_name, street_address, lot_number, is_claimed 
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