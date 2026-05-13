const express = require("express");
const router = express.Router();
const db = require("../db");

// Get all announcements, newest first
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM announcements ORDER BY created_at DESC",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
