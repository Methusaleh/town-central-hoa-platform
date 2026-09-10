const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../db");
const { uploadToR2 } = require("../utils/s3Storage");
const { checkImageSafety, checkTextToxicity, checkImageBuffer, isAllowedGifUrl } = require("../utils/safetyFilter");
const { authRequired, boardRequired } = require("../middleware/auth");

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const TABLES = {
  posts: "porch_posts",
  comments: "porch_comments",
};

const COMMENT_PHOTO_SQL = `
  SELECT c.*, u.profile_photo AS author_photo
    FROM porch_comments c
    LEFT JOIN LATERAL (
      SELECT profile_photo
        FROM users
       WHERE (c.author_email IS NOT NULL AND lower(trim(email)) = lower(trim(c.author_email)))
          OR (
            c.author_email IS NULL AND (
              lower(trim(first_name || ' ' || last_name)) = lower(trim(c.author_name))
              OR lower(trim(first_name)) = lower(trim(c.author_name))
            )
          )
       ORDER BY CASE WHEN c.author_email IS NOT NULL THEN 0 ELSE 1 END
       LIMIT 1
    ) u ON true
`;

function parseLimit(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return 20;
  return Math.min(50, Math.max(1, n));
}

function parseId(value) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function commentsForPost(postId) {
  const { rows } = await db.query(
    `${COMMENT_PHOTO_SQL}
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC`,
    [postId],
  );
  return rows;
}

router.get("/", authRequired, async (req, res) => {
  const limit = parseLimit(req.query.limit);
  const before = parseId(req.query.before);
  const q = String(req.query.q || "").trim().slice(0, 80) || null;

  try {
    const { rows } = await db.query(
      `
      SELECT p.*, u.profile_photo AS author_photo,
             (SELECT COUNT(*)::int FROM porch_comments c WHERE c.post_id = p.id) AS reply_count
        FROM porch_posts p
        LEFT JOIN users u ON lower(trim(u.email)) = lower(trim(p.author_email))
       WHERE (
          $1::int IS NULL
          OR (p.created_at, p.id) < (
            SELECT pp.created_at, pp.id FROM porch_posts pp WHERE pp.id = $1
          )
        )
         AND (
          $2::text IS NULL
          OR p.content ILIKE '%' || $2 || '%'
          OR p.author_name ILIKE '%' || $2 || '%'
        )
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT $3
      `,
      [before, q, limit + 1],
    );

    const hasMore = rows.length > limit;
    const posts = hasMore ? rows.slice(0, limit) : rows;
    res.json({ posts, hasMore });
  } catch (err) {
    console.error("Error fetching Porch stream:", err.message);
    res.status(500).json({ error: "Server error while fetching Porch posts." });
  }
});

router.get("/:id", authRequired, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(404).json({ error: "Post not found." });
  }

  try {
    const { rows } = await db.query(
      `
      SELECT p.*, u.profile_photo AS author_photo,
             (SELECT COUNT(*)::int FROM porch_comments c WHERE c.post_id = p.id) AS reply_count
        FROM porch_posts p
        LEFT JOIN users u ON lower(trim(u.email)) = lower(trim(p.author_email))
       WHERE p.id = $1
      `,
      [id],
    );
    if (!rows[0]) {
      return res.status(404).json({ error: "Post not found." });
    }
    const comments = await commentsForPost(id);
    res.json({ post: rows[0], comments });
  } catch (err) {
    console.error("Error fetching Porch post:", err.message);
    res.status(500).json({ error: "Server error while fetching that post." });
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
      const bufferCheck = await checkImageBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
      if (!bufferCheck.safe) {
        return res.status(400).json({ error: bufferCheck.reason });
      }
      imageUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
    } else if (imageUrl && !isAllowedGifUrl(imageUrl)) {
      return res.status(400).json({ error: "GIFs must be chosen from the GIF picker." });
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
      [author_name || req.user.first_name || "Resident", author_email || req.user.email || null, content.trim(), imageUrl],
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
  const text = (content || "").trim();

  if (!text && !req.file && !req.body.image_url) {
    return res.status(400).json({ error: "A note, photo, or GIF is required." });
  }

  try {
    const note = text || (req.file ? "Shared a photo" : "Shared a GIF");
    const textCheck = await checkTextToxicity(note);
    if (!textCheck.safe) {
      return res.status(400).json({ error: textCheck.reason });
    }

    let imageUrl = req.body.image_url || null;
    if (req.file) {
      const bufferCheck = await checkImageBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
      if (!bufferCheck.safe) {
        return res.status(400).json({ error: bufferCheck.reason });
      }
      imageUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
    } else if (imageUrl && !isAllowedGifUrl(imageUrl)) {
      return res.status(400).json({ error: "GIFs must be chosen from the GIF picker." });
    }

    if (imageUrl) {
      const imageCheck = await checkImageSafety(imageUrl);
      if (!imageCheck.safe) {
        return res.status(400).json({ error: imageCheck.reason });
      }
    }

    const { rows } = await db.query(
      `
      INSERT INTO porch_comments (post_id, author_name, author_email, content, image_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `,
      [postId, author_name || "Resident", req.user.email || null, note, imageUrl],
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
