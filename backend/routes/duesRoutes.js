const express = require("express");
const router = express.Router();
const db = require("../db");

// Get dues status for a specific resident (using name for now since we haven't done Auth yet)
router.get("/:firstName", async (req, res) => {
  try {
    const { firstName } = req.params;
    const { rows } = await db.query(
      "SELECT * FROM resident_dues WHERE first_name = $1",
      [firstName],
    );
    res.json(rows[0] || { balance: 0, status: "No Record" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dues/update-balance - Admin adjustment for a resident's financial ledger entry
router.put("/update-balance", async (req, res) => {
  const { first_name, balance, status } = req.body;

  if (!first_name) {
    return res.status(400).json({ error: "Resident first name is required to update dues records." });
  }

  try {
    const query = `
      UPDATE resident_dues 
      SET balance = $1, 
          status = $2,
          last_payment_date = CURRENT_TIMESTAMP
      WHERE first_name = $3
      RETURNING *;
    `;
    
    const { rows } = await db.query(query, [
      balance || 0.00, 
      status || "Pending", 
      first_name.trim()
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "No dues record found matching that resident name." });
    }

    res.json({
      success: true,
      message: "Financial ledger updated successfully.",
      updatedRecord: rows[0]
    });
  } catch (err) {
    console.error("Dues update error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
