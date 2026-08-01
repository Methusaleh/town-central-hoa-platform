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

// POST /api/dues/manual-payment - Admin logs a Payment or Issue Charge
router.post("/manual-payment", async (req, res) => {
  const { street_address, amount, payment_method, reference_note, admin_name, transaction_type } = req.body;

  if (!street_address || !amount) {
    return res.status(400).json({ error: "Street address and amount are required fields." });
  }

  const txType = transaction_type || "payment"; // 'payment', 'charge', or 'opening_balance'

  try {
    await db.query("BEGIN");

    // 1. Log the transaction in the shared address ledger
    await db.query(
      `INSERT INTO ledger_transactions 
      (address, amount, transaction_type, payment_method, reference_note, created_by) 
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        street_address.trim(), 
        amount, 
        txType === "charge" || txType === "opening_balance" ? "charge" : "payment", 
        payment_method || (txType === "charge" ? "system" : "check"), 
        reference_note, 
        admin_name
      ]
    );

    // 2. Update the shared resident_dues balance for this address
    let updateQuery = "";
    if (txType === "charge" || txType === "opening_balance") {
      updateQuery = `
        UPDATE resident_dues 
        SET balance = balance + $1, 
            status = 'Pending'
        WHERE street_address = $2
        RETURNING balance, status
      `;
    } else {
      updateQuery = `
        UPDATE resident_dues 
        SET balance = balance - $1, 
            last_payment_date = CURRENT_DATE,
            status = CASE WHEN (balance - $1) <= 0 THEN 'Paid' ELSE 'Partial' END
        WHERE street_address = $2
        RETURNING balance, status
      `;
    }

    const updateRes = await db.query(updateQuery, [amount, street_address.trim()]);

    // If the address hasn't been initialized in resident_dues yet, create it automatically
    if (updateRes.rows.length === 0) {
      const initialBalance = txType === "charge" || txType === "opening_balance" ? amount : -amount;
      const initRes = await db.query(
        `INSERT INTO resident_dues (street_address, balance, status) 
         VALUES ($1, $2, $3) 
         RETURNING balance, status`,
        [street_address.trim(), initialBalance, initialBalance > 0 ? "Pending" : "Paid"]
      );
      updateRes.rows = initRes.rows;
    }

    await db.query("COMMIT");

    res.json({ 
      success: true, 
      message: "Ledger transaction recorded successfully.",
      new_balance: updateRes.rows[0].balance,
      new_status: updateRes.rows[0].status
    });

  } catch (err) {
    await db.query("ROLLBACK");
    console.error("Ledger transaction error:", err);
    res.status(500).json({ error: err.message || "Failed to process ledger entry." });
  }
});

module.exports = router;