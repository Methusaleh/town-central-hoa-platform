const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all events (Sorted by upcoming date)
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM neighborhood_events WHERE event_date >= CURRENT_DATE ORDER BY event_date ASC",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new event with optional document attachments
router.post("/", async (req, res) => {
  const { title, event_date, event_time, location, description, attachment_url, attachment_name } = req.body;
  try {
    const query = `
      INSERT INTO neighborhood_events (title, event_date, event_time, location, description, attachment_url, attachment_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const { rows } = await db.query(query, [
      title,
      event_date,
      event_time,
      location,
      description,
      attachment_url || null,   // Falls back gracefully if no file is attached
      attachment_name || null
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
