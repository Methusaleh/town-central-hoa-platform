const express = require("express");
const router = express.Router();
const db = require("../db");
const { authRequired, boardRequired } = require("../middleware/auth");

// 1. GET all notifications for the resident's dashboard feed
router.get("/", authRequired, async (req, res) => {
  try {
    const query = `
      SELECT * FROM neighborhood_notifications 
      ORDER BY created_at DESC 
      LIMIT 20;
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching notifications:", err.message);
    res.status(500).json({ error: "Server error while fetching notifications." });
  }
});

// 2. POST a new notification from the Executive Board Portal
router.post("/", boardRequired, async (req, res) => {
  const { title, message, channel_type, sender_id } = req.body;

  if (!title || !message || !channel_type) {
    return res.status(400).json({ error: "Title, message, and channel type are all required fields." });
  }

  try {
    const query = `
      INSERT INTO neighborhood_notifications (title, message, channel_type, sender_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [title, message, channel_type, sender_id || null];
    const { rows } = await db.query(query, values);

    // TODO: In the future, this is exactly where we will trigger our 
    // real-time WebSocket broadcast or standard email/SMS dispatch worker.

    res.status(201).json({
      success: true,
      notification: rows[0]
    });
  } catch (err) {
    console.error("Error creating notification:", err.message);
    res.status(500).json({ error: "Server error while saving notification." });
  }
});

module.exports = router;