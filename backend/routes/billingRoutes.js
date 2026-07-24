const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const db = require("../db");

// POST /api/billing/create-intent - Initialize Stripe payment/setup for ACH
router.post("/create-intent", async (req, res) => {
  const { email, amount, street_address } = req.body;

  if (!email || !amount || !street_address) {
    return res.status(400).json({ error: "Missing required billing parameters." });
  }

  try {
    // Add the flat $5 processing fee to the charge if desired, or process base amount
    const totalAmountCents = Math.round((parseFloat(amount) + 5.00) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountCents,
      currency: "usd",
      payment_method_types: ["us_bank_account"],
      payment_method_options: {
        us_bank_account: {
          verification_method: "automatic",
        },
      },
      metadata: { email, street_address },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Stripe Intent Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Stripe Webhook Endpoint to automate database updates when payment succeeds
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const { street_address, email } = paymentIntent.metadata;
    const amountPaid = paymentIntent.amount_received / 100 - 5.00; // Subtract fee portion

    try {
      await db.query("BEGIN");
      // 1. Log transaction
      await db.query(
        `INSERT INTO ledger_transactions (address, amount, transaction_type, payment_method, reference_note, created_by) 
         VALUES ($1, $2, 'payment', 'stripe_ach', 'Automated Digital Checkout', 'Stripe System')`,
        [street_address, amountPaid]
      );
      // 2. Update balance
      await db.query(
        `UPDATE resident_dues 
         SET balance = balance - $1, last_payment_date = CURRENT_DATE, status = CASE WHEN (balance - $1) <= 0 THEN 'Paid' ELSE 'Partial' END
         WHERE street_address = $2`,
        [amountPaid, street_address]
      );
      await db.query("COMMIT");
    } catch (dbErr) {
      await db.query("ROLLBACK");
      console.error("Webhook DB Sync Error:", dbErr.message);
    }
  }

  res.json({ received: true });
});

module.exports = router;