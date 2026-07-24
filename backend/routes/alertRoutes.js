const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../db");
const { uploadToR2 } = require("../utils/s3Storage");

// Use memory storage for temporary file handling (max 5MB)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } 
});

// GET: Fetch all active alerts
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM community_alerts ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching community alerts:", err.message);
    res.status(500).json({ error: "Server error while fetching community alerts." });
  }
});

// POST: Publish a new community alert with an optional image file attachment
router.post("/", upload.single("image"), async (req, res) => {
  const { category, author, content } = req.body;

  if (!category || !content) {
    return res.status(400).json({ error: "Category and content are required fields." });
  }

  try {
    let imageUrl = null;

    // If an image file was attached, send it to Cloudflare R2 storage
    if (req.file) {
      imageUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    const query = `
      INSERT INTO community_alerts (category, author, content, image_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const { rows } = await db.query(query, [
      category, 
      author || "Verified Resident", 
      content, 
      imageUrl
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error creating alert with image:", err.message);
    res.status(500).json({ error: "Server error while posting community alert." });
  }
});

// PATCH: Handle community reporting/flagging
router.patch("/:id/flag", async (req, res) => {
  const { id } = req.params;

  try {
    const updateRes = await db.query(
      `UPDATE community_alerts 
       SET flags = flags + 1 
       WHERE id = $1 
       RETURNING flags;`,
      [id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: "Alert not found." });
    }

    const currentFlags = updateRes.rows[0].flags;

    if (currentFlags >= 3) {
      await db.query("DELETE FROM community_alerts WHERE id = $1", [id]);
      return res.json({ success: true, removed: true, message: "Alert removed due to community flags." });
    }

    res.json({ success: true, removed: false, flags: currentFlags });
  } catch (err) {
    console.error("Error flagging alert:", err.message);
    res.status(500).json({ error: "Server error processing flag." });
  }
});

module.exports = router;