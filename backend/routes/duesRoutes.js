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

module.exports = router;
