const express = require("express");
const router = express.Router();
const db = require("../db");
const { authRequired, boardRequired, isBoard } = require("../middleware/auth");

function daysPastDue(balance, dueSince) {
  if (!(Number(balance) > 0) || !dueSince) return 0;
  const start = new Date(dueSince).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 86400000));
}

function withAging(account) {
  return { ...account, days_past_due: daysPastDue(account.balance, account.due_since) };
}

async function dueSinceForStreet(street) {
  const { rows } = await db.query(
    `SELECT COALESCE(
       (SELECT MIN(created_at) FROM ledger_transactions
        WHERE lower(trim(address)) = lower(trim($1))
          AND transaction_type = 'charge'
          AND created_at > COALESCE(
            (SELECT last_payment_date FROM resident_dues WHERE lower(trim(street_address)) = lower(trim($1))),
            TIMESTAMP '1900-01-01'
          )),
       (SELECT MIN(created_at) FROM ledger_transactions
        WHERE lower(trim(address)) = lower(trim($1))
          AND transaction_type = 'charge')
     ) AS due_since`,
    [street],
  );
  return rows[0]?.due_since || null;
}

async function applyLedgerEntry({
  street_address,
  amount,
  payment_method,
  reference_note,
  admin_name,
  transaction_type,
}) {
  const street = street_address.trim();
  const txType = transaction_type || "payment";
  const isCharge = txType === "charge" || txType === "opening_balance";

  await db.query(
    `INSERT INTO ledger_transactions
    (address, amount, transaction_type, payment_method, reference_note, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      street,
      amount,
      isCharge ? "charge" : "payment",
      payment_method || (isCharge ? "system" : "check"),
      reference_note,
      admin_name,
    ],
  );

  let updateRes = await db.query(
    `UPDATE resident_dues
     SET balance = balance ${isCharge ? "+" : "-"} $1,
         status = CASE WHEN (balance ${isCharge ? "+" : "-"} $1) <= 0 THEN 'Paid' ELSE 'Pending' END
         ${isCharge ? "" : ", last_payment_date = CURRENT_TIMESTAMP"}
     WHERE street_address = $2
     RETURNING balance, status`,
    [amount, street],
  );

  if (updateRes.rows.length === 0) {
    const initialBalance = isCharge ? amount : -amount;
    updateRes = await db.query(
      `INSERT INTO resident_dues (street_address, balance, status)
       VALUES ($1, $2, $3)
       RETURNING balance, status`,
      [street, initialBalance, initialBalance > 0 ? "Pending" : "Paid"],
    );
  }

  return updateRes.rows[0];
}

router.get("/admin/overview", boardRequired, async (_req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        r.id,
        TRIM(COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '')) AS household,
        r.street_address,
        COALESCE(r.is_claimed, false) AS is_claimed,
        COALESCE(d.balance, 0)::numeric AS balance,
        COALESCE(d.status, 'No Record') AS status,
        d.last_payment_date,
        COALESCE((
          SELECT MIN(t.created_at)
          FROM ledger_transactions t
          WHERE lower(trim(t.address)) = lower(trim(r.street_address))
            AND t.transaction_type = 'charge'
            AND t.created_at > COALESCE(d.last_payment_date, TIMESTAMP '1900-01-01')
        ), (
          SELECT MIN(t.created_at)
          FROM ledger_transactions t
          WHERE lower(trim(t.address)) = lower(trim(r.street_address))
            AND t.transaction_type = 'charge'
        )) AS due_since,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', u.id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'email', u.email
          ) ORDER BY u.last_name, u.first_name)
          FROM users u
          WHERE lower(trim(u.address)) = lower(trim(r.street_address))
        ), '[]'::json) AS members
      FROM neighborhood_roster r
      LEFT JOIN resident_dues d
        ON lower(trim(d.street_address)) = lower(trim(r.street_address))
      ORDER BY COALESCE(d.balance, 0) DESC, r.street_address ASC
    `);
    res.json({ accounts: rows.map(withAging) });
  } catch (err) {
    console.error("Dues overview error:", err.message);
    res.status(500).json({ error: "Server error loading the assessment ledger." });
  }
});

router.get("/history/:address", authRequired, async (req, res) => {
  try {
    const { address } = req.params;
    if (address.trim().toLowerCase() !== (req.user.address || "").toLowerCase() && !isBoard(req.user)) {
      return res.status(403).json({ error: "You can only view your own ledger." });
    }
    const { rows } = await db.query(
      "SELECT * FROM ledger_transactions WHERE address = $1 ORDER BY created_at DESC",
      [address.trim()]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:email", authRequired, async (req, res) => {
  try {
    const { email } = req.params;
    if (email.trim().toLowerCase() !== req.user.email && !isBoard(req.user)) {
      return res.status(403).json({ error: "You can only view your own dues." });
    }

    const userQuery = "SELECT address FROM users WHERE email = $1";
    const userResult = await db.query(userQuery, [email.trim().toLowerCase()]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Portal profile not found." });
    }

    const streetAddress = userResult.rows[0].address;
    const duesQuery = "SELECT * FROM resident_dues WHERE street_address ILIKE $1";
    const { rows } = await db.query(duesQuery, [streetAddress.trim()]);
    const record = rows[0] || {
      street_address: streetAddress,
      balance: 0.00,
      status: "No Record",
      next_due_date: "2026-12-31",
    };
    record.due_since = await dueSinceForStreet(streetAddress);
    res.json(withAging(record));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dues/update-balance - Admin modification targeting the address text field directly
router.put("/update-balance", boardRequired, async (req, res) => {
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

// POST /api/dues/manual-payment - Admin logs a Payment or Issue Charge (Activates property in resident_dues)
router.post("/manual-payment", boardRequired, async (req, res) => {
  const { street_address, amount, payment_method, reference_note, admin_name, transaction_type } = req.body;

  if (!street_address || !amount) {
    return res.status(400).json({ error: "Street address and amount are required fields." });
  }

  try {
    await db.query("BEGIN");
    const result = await applyLedgerEntry({
      street_address,
      amount,
      payment_method,
      reference_note,
      admin_name,
      transaction_type,
    });
    await db.query("COMMIT");

    res.json({
      success: true,
      message: "Ledger transaction recorded and property activated successfully.",
      new_balance: result.balance,
      new_status: result.status,
    });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("Ledger transaction error:", err);
    res.status(500).json({ error: err.message || "Failed to process ledger entry." });
  }
});

async function postBulkLedger({ street_addresses, amount, reference_note, admin_name, transaction_type, payment_method }) {
  const streets = [...new Set((street_addresses || []).map((item) => String(item || "").trim()).filter(Boolean))];
  const entryAmount = Number(amount);
  const txType = transaction_type === "payment" ? "payment" : "charge";
  const isPayment = txType === "payment";

  if (!streets.length || !entryAmount || Number.isNaN(entryAmount) || entryAmount <= 0) {
    const error = new Error(isPayment ? "Choose households and enter a payment amount." : "Choose households and enter a charge amount.");
    error.status = 400;
    throw error;
  }

  await db.query("BEGIN");
  try {
    for (const street of streets) {
      await applyLedgerEntry({
        street_address: street,
        amount: entryAmount,
        payment_method: payment_method || (isPayment ? "check" : "system"),
        reference_note: reference_note || (isPayment ? "Bulk household payment" : "Bulk household charge"),
        admin_name: admin_name || "Board Treasurer",
        transaction_type: txType,
      });
    }
    await db.query("COMMIT");
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }

  return {
    success: true,
    count: streets.length,
    message: isPayment
      ? `Recorded payments for ${streets.length} household${streets.length === 1 ? "" : "s"}.`
      : `Charged ${streets.length} household${streets.length === 1 ? "" : "s"}.`,
  };
}

router.post("/bulk-charge", boardRequired, async (req, res) => {
  try {
    const result = await postBulkLedger({ ...req.body, transaction_type: "charge" });
    res.json(result);
  } catch (err) {
    console.error("Bulk charge error:", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to post bulk charges." });
  }
});

router.post("/bulk-entry", boardRequired, async (req, res) => {
  try {
    const result = await postBulkLedger(req.body);
    res.json(result);
  } catch (err) {
    console.error("Bulk ledger error:", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to post those ledger entries." });
  }
});

module.exports = router;