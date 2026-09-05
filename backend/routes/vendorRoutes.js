const express = require("express");
const router = express.Router();
const db = require("../db");
const { authRequired, boardRequired } = require("../middleware/auth");

// 1. READ: Get all verified vendors
router.get("/", authRequired, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM verified_vendors ORDER BY company_name ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. CREATE: Add a new trusted company
router.post("/", boardRequired, async (req, res) => {
  const { company_name, service_type, contact_phone, contact_email, website_url, notes } = req.body;
  try {
    const query = `
      INSERT INTO verified_vendors (company_name, service_type, contact_phone, contact_email, website_url, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const { rows } = await db.query(query, [company_name, service_type, contact_phone, contact_email, website_url, notes]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. UPDATE: Edit an existing company's details
router.put("/:id", boardRequired, async (req, res) => {
  const { id } = req.params;
  const { company_name, service_type, contact_phone, contact_email, website_url, notes } = req.body;
  try {
    const query = `
      UPDATE verified_vendors 
      SET company_name = $1, service_type = $2, contact_phone = $3, contact_email = $4, website_url = $5, notes = $6
      WHERE id = $7
      RETURNING *;
    `;
    const { rows } = await db.query(query, [company_name, service_type, contact_phone, contact_email, website_url, notes, id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. DELETE: Remove a company completely
router.delete("/:id", boardRequired, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM verified_vendors WHERE id = $1", [id]);
    res.json({ message: "Vendor successfully removed from directory." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;