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

// POST /api/residents/admin-add - Onboard a new neighbor into the roster schema
router.post("/admin-add", async (req, res) => {
  const { first_name, last_name, email, street_address } = req.body;

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

    res.status(201).json({
      success: true,
      message: "Resident successfully appended to the neighborhood roster database.",
      resident: rows[0]
    });
  } catch (err) {
    console.error("Database insertion error:", err.message);
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