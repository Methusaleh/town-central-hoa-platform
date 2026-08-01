const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../db");
const { uploadToR2 } = require("../utils/s3Storage");
const { checkImageSafety, checkTextToxicity } = require("../utils/safetyFilter"); // Added safety filter import

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET: Fetch all active/visible water-cooler posts with their comments
router.get("/", async (req, res) => {
  try {
    const postsQuery = `
      SELECT * FROM watercooler_posts 
      ORDER BY created_at DESC;
    `;
    const postsRes = await db.query(postsQuery);
    
    // Fetch all comments for these posts
    const commentsQuery = `
      SELECT * FROM watercooler_comments 
      ORDER BY created_at ASC;
    `;
    const commentsRes = await db.query(commentsQuery);

    res.json({
      posts: postsRes.rows,
      comments: commentsRes.rows
    });
  } catch (err) {
    console.error("Error fetching water-cooler stream:", err.message);
    res.status(500).json({ error: "Server error while fetching water-cooler posts." });
  }
});

// POST: Publish a new water-cooler post (supports image file attachment & safety filters)
router.post("/", upload.single("image"), async (req, res) => {
  const { author_name, author_email, content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Post content is required." });
  }

  try {
    // 1. Text Toxicity Check via Perspective API
    const textCheck = await checkTextToxicity(content.trim());
    if (!textCheck.safe) {
      return res.status(400).json({ error: textCheck.reason });
    }

    let imageUrl = req.body.image_url || null; // Can accept direct Tenor GIF URL or uploaded file

    if (req.file) {
      imageUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    // 2. Image Safety Check via Sightengine API (if image/GIF URL is provided)
    if (imageUrl) {
      const imageCheck = await checkImageSafety(imageUrl);
      if (!imageCheck.safe) {
        return res.status(400).json({ error: imageCheck.reason });
      }
    }

    const query = `
      INSERT INTO watercooler_posts (author_name, author_email, content, image_url, reactions)
      VALUES ($1, $2, $3, $4, '{}'::jsonb)
      RETURNING *;
    `;
    const { rows } = await db.query(query, [
      author_name || "Resident",
      author_email || null,
      content.trim(),
      imageUrl
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error posting to water-cooler:", err.message);
    res.status(500).json({ error: "Server error publishing post." });
  }
});

// POST: Add a comment/reply to a water-cooler post (supports safety filters)
router.post("/:postId/comments", upload.single("image"), async (req, res) => {
  const { postId } = req.params;
  const { author_name, content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Comment content is required." });
  }

  try {
    // 1. Text Toxicity Check for comments
    const textCheck = await checkTextToxicity(content.trim());
    if (!textCheck.safe) {
      return res.status(400).json({ error: textCheck.reason });
    }

    let imageUrl = req.body.image_url || null;
    if (req.file) {
      imageUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    // 2. Image Safety Check for comment attachments
    if (imageUrl) {
      const imageCheck = await checkImageSafety(imageUrl);
      if (!imageCheck.safe) {
        return res.status(400).json({ error: imageCheck.reason });
      }
    }

    const query = `
      INSERT INTO watercooler_comments (post_id, author_name, content, image_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const { rows } = await db.query(query, [
      postId,
      author_name || "Resident",
      content.trim(),
      imageUrl
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error posting comment:", err.message);
    res.status(500).json({ error: "Server error posting comment." });
  }
});

// PATCH: Admin/Board Moderation Removal with Stock Reason
router.patch("/:type/:id/moderate", async (req, res) => {
  const { type, id } = req.params; // type is 'posts' or 'comments'
  const { removal_reason } = req.body;

  const tableName = type === "comments" ? "watercooler_comments" : "watercooler_posts";
  const replacementText = "[This post/comment has been removed by an admin for violating community guidelines.]";

  try {
    const query = `
      UPDATE ${tableName} 
      SET is_removed = true, 
          removal_reason = $1,
          content = $2,
          image_url = NULL
      WHERE id = $3 
      RETURNING *;
    `;
    const { rows } = await db.query(query, [
      removal_reason || "Violates community guidelines",
      replacementText,
      id
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Item not found." });
    }

    res.json({ success: true, item: rows[0] });
  } catch (err) {
    console.error("Moderation removal error:", err.message);
    res.status(500).json({ error: "Server error processing moderation action." });
  }
});

module.exports = router;