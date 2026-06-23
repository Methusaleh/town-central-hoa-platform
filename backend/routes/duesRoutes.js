const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/dues/:email - Pull ledger data matching the user's home address string
router.get("/:email", async (req, res) => {
  try {
    const { email } = req.params;
    
    // 1. Grab the user's registered street address text directly
    const userQuery = "SELECT address FROM users WHERE email = $1";
    const userResult = await db.query(userQuery, [email.trim().toLowerCase()]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Portal profile not found." });
    }
    
    const streetAddress = userResult.rows[0].address;

    // 2. Fetch dues statement row linked directly to that address text
    const duesQuery = "SELECT * FROM resident_dues WHERE street_address ILIKE $1";
    const { rows } = await db.query(duesQuery, [streetAddress.trim()]);
    
    res.json(rows[0] || { street_address: streetAddress, balance: 0.00, status: "No Record", next_due_date: "2026-12-31" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dues/update-balance - Admin modification targeting the address text field directly
router.put("/update-balance", async (req, res) => {
  const { street_address, balance, status } = req.body;

  if (!street_address) {
    return res.status(400).json({ error: "Street address identification parameter is required." });
  }

  try {
    const query = `
      INSERT INTO resident_dues (street_address, balance, status, last_payment_date)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (street_address) 
      DO UPDATE SET balance = $2, status = $3, last_payment_date = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    
    const { rows } = await db.query(query, [street_address.trim(), balance || 0.00, status || "Pending"]);
    res.json({ success: true, message: "Household ledger updated successfully.", updatedRecord: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;