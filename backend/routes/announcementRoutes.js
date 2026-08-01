const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../db");
const { uploadToR2 } = require("../utils/s3Storage");

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET: Get all announcements (Stickies sorted first, then newest)
router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT * FROM announcements 
      ORDER BY is_sticky DESC, created_at DESC;
    `;
    const { rows } = await db.query(query);

    // Also fetch comments for announcements if you want threaded replies
    const commentsRes = await db.query("SELECT * FROM announcement_comments ORDER BY created_at ASC");

    res.json({
      announcements: rows,
      comments: commentsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Post a new announcement (Board/Admin only) with optional image/GIF and sticky toggle
router.post("/", upload.single("image"), async (req, res) => {
  const { title, content, priority, channel_type, is_sticky } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required fields." });
  }

  try {
    let imageUrl = req.body.image_url || null;
    if (req.file) {
      imageUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    const query = `
      INSERT INTO announcements (title, content, priority, channel_type, is_sticky, image_url, reactions)
      VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb)
      RETURNING *;
    `;
    const values = [
      title.trim(),
      content.trim(),
      priority || "normal",
      channel_type || "general",
      is_sticky === "true" || is_sticky === true,
      imageUrl
    ];

    const { rows } = await db.query(query, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Announcement post error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST: Add a comment/reply to an announcement
router.post("/:announcementId/comments", async (req, res) => {
  const { announcementId } = req.params;
  const { author_name, content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Comment content is required." });
  }

  try {
    const query = `
      INSERT INTO announcement_comments (announcement_id, author_name, content)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const { rows } = await db.query(query, [announcementId, author_name || "Resident", content.trim()]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH: Admin removal with stock reason
router.patch("/:id/moderate", async (req, res) => {
  const { id } = req.params;
  const { removal_reason } = req.body;
  const replacementText = "[This announcement has been removed by an admin for violating community guidelines.]";

  try {
    const query = `
      UPDATE announcements 
      SET is_removed = true, 
          removal_reason = $1,
          content = $2,
          image_url = NULL
      WHERE id = $3 
      RETURNING *;
    `;
    const { rows } = await db.query(query, [removal_reason || "Violates community guidelines", replacementText, id]);

    if (rows.length === 0) return res.status(404).json({ error: "Announcement not found." });
    res.json({ success: true, item: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;