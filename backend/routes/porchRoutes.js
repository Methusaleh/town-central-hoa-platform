const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../db");
const { uploadToR2 } = require("../utils/s3Storage");
const { checkImageSafety, checkTextToxicity } = require("../utils/safetyFilter");
const { authRequired, boardRequired } = require("../middleware/auth");

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const TABLES = {
  posts: "porch_posts",
  comments: "porch_comments",
};

router.get("/", authRequired, async (req, res) => {
  try {
    const postsRes = await db.query(`
      SELECT * FROM porch_posts
      ORDER BY created_at DESC;
    `);
    const commentsRes = await db.query(`
      SELECT * FROM porch_comments
      ORDER BY created_at ASC;
    `);

    res.json({
      posts: postsRes.rows,
      comments: commentsRes.rows,
    });
  } catch (err) {
    console.error("Error fetching Porch stream:", err.message);
    res.status(500).json({ error: "Server error while fetching Porch posts." });
  }
});

router.post("/", authRequired, upload.single("image"), async (req, res) => {
  const { author_name, author_email, content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Post content is required." });
  }

  try {
    const textCheck = await checkTextToxicity(content.trim());
    if (!textCheck.safe) {
      return res.status(400).json({ error: textCheck.reason });
    }

    let imageUrl = req.body.image_url || null;

    if (req.file) {
      imageUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    if (imageUrl) {
      const imageCheck = await checkImageSafety(imageUrl);
      if (!imageCheck.safe) {
        return res.status(400).json({ error: imageCheck.reason });
      }
    }

    const { rows } = await db.query(
      `
      INSERT INTO porch_posts (author_name, author_email, content, image_url, reactions)
      VALUES ($1, $2, $3, $4, '{}'::jsonb)
      RETURNING *;
    `,
      [author_name || "Resident", author_email || null, content.trim(), imageUrl],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error posting to The Porch:", err.message);
    res.status(500).json({ error: "Server error publishing post." });
  }
});

router.patch("/:id/reactions", authRequired, async (req, res) => {
  const { emoji } = req.body;
  const identity = req.user.email || String(req.user.id);
  if (!emoji || typeof emoji !== "string") {
    return res.status(400).json({ error: "A reaction is required." });
  }

  try {
    const { rows } = await db.query("SELECT id, reactions FROM porch_posts WHERE id = $1", [
      req.params.id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Post not found." });
    }

    const reactions =
      rows[0].reactions && typeof rows[0].reactions === "object" ? rows[0].reactions : {};
    const current = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
    const next = current.includes(identity)
      ? current.filter((item) => item !== identity)
      : [...current, identity];

    if (next.length === 0) delete reactions[emoji];
    else reactions[emoji] = next;

    const updated = await db.query(
      "UPDATE porch_posts SET reactions = $1::jsonb WHERE id = $2 RETURNING *",
      [JSON.stringify(reactions), req.params.id],
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error("Error updating reaction:", err.message);
    res.status(500).json({ error: "Server error saving reaction." });
  }
});

router.post("/:postId/comments", authRequired, upload.single("image"), async (req, res) => {
  const { postId } = req.params;
  const { author_name, content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Comment content is required." });
  }

  try {
    const textCheck = await checkTextToxicity(content.trim());
    if (!textCheck.safe) {
      return res.status(400).json({ error: textCheck.reason });
    }

    let imageUrl = req.body.image_url || null;
    if (req.file) {
      imageUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    if (imageUrl) {
      const imageCheck = await checkImageSafety(imageUrl);
      if (!imageCheck.safe) {
        return res.status(400).json({ error: imageCheck.reason });
      }
    }

    const { rows } = await db.query(
      `
      INSERT INTO porch_comments (post_id, author_name, content, image_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `,
      [postId, author_name || "Resident", content.trim(), imageUrl],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error posting comment:", err.message);
    res.status(500).json({ error: "Server error posting comment." });
  }
});

router.patch("/:type/:id/moderate", boardRequired, async (req, res) => {
  const { type, id } = req.params;
  const { removal_reason } = req.body;
  const tableName = TABLES[type];

  if (!tableName) {
    return res.status(400).json({ error: "Invalid moderation target." });
  }

  const replacementText =
    "[This post/comment has been removed by an admin for violating community guidelines.]";

  try {
    const { rows } = await db.query(
      `
      UPDATE ${tableName}
      SET is_removed = true,
          removal_reason = $1,
          content = $2,
          image_url = NULL
      WHERE id = $3
      RETURNING *;
    `,
      [removal_reason || "Violates community guidelines", replacementText, id],
    );

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
