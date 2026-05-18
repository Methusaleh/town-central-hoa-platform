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

// POST a new announcement
router.post("/", async (req, res) => {
  try {
    const { title, content, priority } = req.body;
    const query = `
      INSERT INTO announcements (title, content, priority)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const values = [title, content, priority || "normal"];
    const { rows } = await db.query(query, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
