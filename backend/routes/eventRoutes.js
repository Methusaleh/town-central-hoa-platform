const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../db");
const { uploadToR2 } = require("../utils/s3Storage");

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET: Fetch all neighborhood events sorted by date
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM neighborhood_events ORDER BY event_date ASC",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Board-managed event creation with optional file attachment
router.post("/", upload.single("attachment"), async (req, res) => {
  const { title, event_date, event_time, location, description, category } = req.body;

  if (!title || !event_date) {
    return res.status(400).json({ error: "Title and event date are required fields." });
  }

  try {
    let attachmentUrl = req.body.attachment_url || null;
    let attachmentName = req.body.attachment_name || null;

    if (req.file) {
      attachmentUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
      attachmentName = req.file.originalname;
    }

    const query = `
      INSERT INTO neighborhood_events (title, event_date, event_time, location, description, category, attachment_url, attachment_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const { rows } = await db.query(query, [
      title.trim(),
      event_date,
      event_time || null,
      location || null,
      description || null,
      category || "Community Event",
      attachmentUrl,
      attachmentName
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Event creation error:", err.message);
    res.status(500).json({ error: "Server error while posting event." });
  }
});

module.exports = router;