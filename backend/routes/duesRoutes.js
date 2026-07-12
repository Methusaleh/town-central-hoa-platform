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
    
    res.json(rows[0] || { 
      street_address: streetAddress, 
      balance: 0.00, 
      status: "No Record", 
      next_due_date: "2026-12-31" 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/history/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const { rows } = await db.query(
      "SELECT * FROM ledger_transactions WHERE address = $1 ORDER BY created_at DESC",
      [address.trim()]
    );
    res.json(rows);
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
    
    const { rows } = await db.query(query, [
      street_address.trim(), 
      balance || 0.00, 
      status || "Pending"
    ]);

    res.json({ 
      success: true, 
      message: "Household ledger updated successfully.", 
      updatedRecord: rows[0] 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dues/manual-payment - Admin logs a Check, Zelle, or ACH
router.post("/manual-payment", async (req, res) => {
  const { street_address, amount, payment_method, reference_note, admin_name } = req.body;

  // Basic validation to ensure required fields aren't missing
  if (!street_address || !amount || !payment_method) {
    return res.status(400).json({ error: "Address, amount, and payment method are required." });
  }

  try {
    await db.query("BEGIN");

    // 1. Log the transaction in the ledger
    await db.query(
      `INSERT INTO ledger_transactions 
      (address, amount, transaction_type, payment_method, reference_note, created_by) 
      VALUES ($1, $2, 'payment', $3, $4, $5)`,
      [street_address.trim(), amount, payment_method, reference_note, admin_name]
    );

    // 2. Update the resident's running balance and last payment date
    const updateRes = await db.query(
      `UPDATE resident_dues 
       SET balance = balance - $1, 
           last_payment_date = CURRENT_DATE,
           status = CASE WHEN (balance - $1) <= 0 THEN 'paid' ELSE 'partial' END
       WHERE street_address = $2
       RETURNING balance, status`,
      [amount, street_address.trim()]
    );

    // 3. Safety check: ensure the property actually existed in resident_dues to be updated
    if (updateRes.rows.length === 0) {
      throw new Error("Property not found in resident_dues table. Please initialize ledger first.");
    }

    await db.query("COMMIT");

    res.json({ 
      success: true, 
      message: "Payment logged successfully.",
      new_balance: updateRes.rows[0].balance,
      new_status: updateRes.rows[0].status
    });

  } catch (err) {
    await db.query("ROLLBACK");
    console.error("Payment entry error:", err);
    res.status(500).json({ error: err.message || "Failed to process manual payment." });
  }
});

module.exports = router;