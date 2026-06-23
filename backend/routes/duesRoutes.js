const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/dues/:email - Fetch household balance using the authenticated user's email address
router.get("/:email", async (req, res) => {
  try {
    const { email } = req.params;
    
    // First, locate the user and find out what physical lot row they are linked to
    const userQuery = "SELECT roster_lot_id, address FROM users WHERE email = $1";
    const userResult = await db.query(userQuery, [email.trim().toLowerCase()]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Portal account profile not found." });
    }
    
    const lotId = userResult.rows[0].roster_lot_id;
    
    // If they haven't claimed a roster lot profile yet, fallback to looking up by address string safely
    let duesQuery = "";
    let queryParams = [];
    
    if (lotId) {
      duesQuery = "SELECT * FROM resident_dues WHERE resident_id = $1";
      queryParams = [lotId];
    } else {
      duesQuery = `
        SELECT rd.* FROM resident_dues rd
        JOIN neighborhood_roster nr ON rd.resident_id = nr.id
        WHERE nr.street_address ILIKE $1
      `;
      queryParams = [`%${userResult.rows[0].address?.trim()}%`];
    }

    const { rows } = await db.query(duesQuery, queryParams);
    
    // Default fallback layout if no financial line exists yet
    res.json(rows[0] || { balance: 0.00, status: "No Record", next_due_date: "2026-12-31" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dues/update-balance - Admin overwrite using the shared lot ID record pointer
router.put("/update-balance", async (req, res) => {
  const { roster_lot_id, balance, status } = req.body;

  if (!roster_lot_id) {
    return res.status(400).json({ error: "Lot ID selection pointer is required." });
  }

  try {
    const query = `
      INSERT INTO resident_dues (resident_id, balance, status, last_payment_date)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (resident_id) 
      DO UPDATE SET balance = $2, status = $3, last_payment_date = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    
    const { rows } = await db.query(query, [roster_lot_id, balance || 0.00, status || "Pending"]);
    res.json({ success: true, message: "Household ledger statement altered perfectly.", updatedRecord: rows[0] });
  } catch (err) {
    console.error("Dues update fault:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;