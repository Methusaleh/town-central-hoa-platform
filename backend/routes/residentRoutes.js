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

// POST /api/residents/register - Flag a roster profile as claimed in the DB
router.post("/register", async (req, res) => {
  const { residentId } = req.body;

  if (!residentId) {
    return res.status(400).json({ error: "Resident ID is required for registration persistence." });
  }

  try {
    const query = `
      UPDATE neighborhood_roster 
      SET is_claimed = true 
      WHERE id = $1 
      RETURNING id, street_address, is_claimed;
    `;
    const { rows } = await db.query(query, [residentId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Resident record not found." });
    }

    res.json({
      success: true,
      message: "Roster profile successfully locked and claimed.",
      updatedRecord: rows[0]
    });
  } catch (err) {
    console.error("Database registration update error:", err.message);
    res.status(500).json({ error: "Server error updating roster state." });
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