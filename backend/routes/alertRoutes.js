const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../db");
const { uploadToR2 } = require("../utils/s3Storage");
const { checkImageSafety, checkTextToxicity, checkImageBuffer } = require("../utils/safetyFilter");
const { authRequired, boardRequired, isBoard } = require("../middleware/auth");

function closeLabelFor(category) {
  if (category === "Lost Pet") return "Found";
  if (category === "Traffic / Party") return "Street is open";
  return "All clear";
}

async function actorName(user) {
  if (!user?.id) return user?.email || "Neighbor";
  const { rows } = await db.query(
    "SELECT first_name, last_name, email FROM users WHERE id = $1",
    [user.id],
  );
  const row = rows[0];
  const name = `${row?.first_name || ""} ${row?.last_name || ""}`.trim();
  return name || row?.email || user.email || "Neighbor";
}

async function canResolveAlert(user, alert) {
  if (!user || !alert) return false;
  if (isBoard(user)) return true;
  const email = String(user.email || "").trim().toLowerCase();
  if (email && String(alert.author_email || "").trim().toLowerCase() === email) {
    return true;
  }
  if (!user.id) return false;
  const { rows } = await db.query(
    "SELECT first_name, last_name FROM users WHERE id = $1",
    [user.id],
  );
  const row = rows[0];
  const name = `${row?.first_name || ""} ${row?.last_name || ""}`.trim().toLowerCase();
  return Boolean(name) && name === String(alert.author || "").trim().toLowerCase();
}

// Use memory storage for temporary file handling (max 5MB)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } 
});

// GET: Fetch all active alerts and their comments
router.get("/", authRequired, async (req, res) => {
  try {
    const alertsRes = await db.query(
      `SELECT a.*, u.profile_photo AS author_photo
       FROM community_alerts a
       LEFT JOIN LATERAL (
         SELECT profile_photo
         FROM users
         WHERE lower(trim(first_name || ' ' || last_name)) = lower(trim(a.author))
            OR lower(trim(first_name)) = lower(trim(a.author))
         ORDER BY CASE
           WHEN lower(trim(first_name || ' ' || last_name)) = lower(trim(a.author)) THEN 0
           ELSE 1
         END
         LIMIT 1
       ) u ON true
       ORDER BY (a.resolved_at IS NULL) DESC, a.created_at DESC`,
    );
    const commentsRes = await db.query(
      `SELECT c.*, u.profile_photo AS author_photo
       FROM alert_comments c
       LEFT JOIN LATERAL (
         SELECT profile_photo
         FROM users
         WHERE lower(trim(first_name || ' ' || last_name)) = lower(trim(c.author_name))
            OR lower(trim(first_name)) = lower(trim(c.author_name))
         ORDER BY CASE
           WHEN lower(trim(first_name || ' ' || last_name)) = lower(trim(c.author_name)) THEN 0
           ELSE 1
         END
         LIMIT 1
       ) u ON true
       ORDER BY c.created_at ASC`,
    );
    res.json({
      alerts: alertsRes.rows,
      comments: commentsRes.rows,
    });
  } catch (err) {
    console.error("Error fetching community alerts:", err.message);
    res.status(500).json({ error: "Server error while fetching community alerts." });
  }
});

// POST: Publish a new community alert with an optional image file attachment & safety filters
router.post("/", authRequired, upload.single("image"), async (req, res) => {
  const { category, author, content } = req.body;

  if (!category || !content) {
    return res.status(400).json({ error: "Category and content are required fields." });
  }

  try {
    // 1. Text Toxicity Check via Perspective API
    const textCheck = await checkTextToxicity(content.trim());
    if (!textCheck.safe) {
      return res.status(400).json({ error: textCheck.reason });
    }

    let imageUrl = null;

    // If an image file was attached, send it to Cloudflare R2 storage
    if (req.file) {
      const bufferCheck = await checkImageBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
      if (!bufferCheck.safe) {
        return res.status(400).json({ error: bufferCheck.reason });
      }
      imageUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    // 2. Image Safety Check via Sightengine API (if an image is attached)
    if (imageUrl) {
      const imageCheck = await checkImageSafety(imageUrl);
      if (!imageCheck.safe) {
        return res.status(400).json({ error: imageCheck.reason });
      }
    }

    const query = `
      INSERT INTO community_alerts (category, author, author_email, content, image_url, reactions)
      VALUES ($1, $2, $3, $4, $5, '{}'::jsonb)
      RETURNING *;
    `;
    const { rows } = await db.query(query, [
      category,
      author || "Verified Resident",
      req.user.email || null,
      content.trim(),
      imageUrl,
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error creating alert with image:", err.message);
    res.status(500).json({ error: "Server error while posting community alert." });
  }
});

// POST: Sighting note (and optional photo) on a lost-pet alert
router.post("/:alertId/comments", authRequired, upload.single("image"), async (req, res) => {
  const { alertId } = req.params;
  const { author_name, content } = req.body;
  const text = (content || "").trim();

  if (!text && !req.file) {
    return res.status(400).json({ error: "A note or a photo is required." });
  }

  try {
    const alertRes = await db.query(
      "SELECT id, category, is_removed, resolved_at FROM community_alerts WHERE id = $1",
      [alertId],
    );
    if (alertRes.rows.length === 0) {
      return res.status(404).json({ error: "Alert not found." });
    }
    if (alertRes.rows[0].is_removed) {
      return res.status(400).json({ error: "That alert isn't posted anymore." });
    }
    if (alertRes.rows[0].resolved_at) {
      return res.status(400).json({ error: "That alert is already resolved." });
    }
    if (alertRes.rows[0].category !== "Lost Pet") {
      return res.status(400).json({ error: "Sightings are only for lost pets." });
    }

    const note = text || "Shared a photo";
    const textCheck = await checkTextToxicity(note);
    if (!textCheck.safe) {
      return res.status(400).json({ error: textCheck.reason });
    }

    let imageUrl = null;
    if (req.file) {
      const bufferCheck = await checkImageBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
      if (!bufferCheck.safe) {
        return res.status(400).json({ error: bufferCheck.reason });
      }
      imageUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
      const imageCheck = await checkImageSafety(imageUrl);
      if (!imageCheck.safe) {
        return res.status(400).json({ error: imageCheck.reason });
      }
    }

    const { rows } = await db.query(
      `
      INSERT INTO alert_comments (alert_id, author_name, content, image_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `,
      [alertId, author_name || "Resident", note, imageUrl],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error adding alert comment:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/resolve", authRequired, async (req, res) => {
  const { id } = req.params;
  try {
    const found = await db.query("SELECT * FROM community_alerts WHERE id = $1", [id]);
    if (found.rows.length === 0) {
      return res.status(404).json({ error: "Alert not found." });
    }
    const alert = found.rows[0];
    if (!(await canResolveAlert(req.user, alert))) {
      return res.status(403).json({ error: "Only the poster or the board can resolve this alert." });
    }
    if (alert.is_removed) {
      return res.status(400).json({ error: "That alert isn't posted anymore." });
    }
    if (alert.resolved_at) {
      return res.status(400).json({ error: "That alert is already resolved." });
    }

    const { rows } = await db.query(
      `UPDATE community_alerts
       SET resolved_at = CURRENT_TIMESTAMP,
           resolved_by = $1,
           resolved_label = $2
       WHERE id = $3
       RETURNING *`,
      [await actorName(req.user), closeLabelFor(alert.category), id],
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("Error resolving alert:", err.message);
    res.status(500).json({ error: "Server error resolving that alert." });
  }
});

router.patch("/:id/reopen", authRequired, async (req, res) => {
  const { id } = req.params;
  try {
    const found = await db.query("SELECT * FROM community_alerts WHERE id = $1", [id]);
    if (found.rows.length === 0) {
      return res.status(404).json({ error: "Alert not found." });
    }
    const alert = found.rows[0];
    if (!(await canResolveAlert(req.user, alert))) {
      return res.status(403).json({ error: "Only the poster or the board can reopen this alert." });
    }
    if (alert.is_removed) {
      return res.status(400).json({ error: "That alert isn't posted anymore." });
    }
    if (!alert.resolved_at) {
      return res.status(400).json({ error: "That alert is still active." });
    }

    const { rows } = await db.query(
      `UPDATE community_alerts
       SET resolved_at = NULL,
           resolved_by = NULL,
           resolved_label = NULL
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("Error reopening alert:", err.message);
    res.status(500).json({ error: "Server error reopening that alert." });
  }
});

// PATCH: Handle community reporting/flagging
router.patch("/:id/flag", authRequired, async (req, res) => {
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

// PATCH: Edit an existing community alert
router.patch("/:id/edit", authRequired, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Content is required for editing." });
  }

  try {
    const textCheck = await checkTextToxicity(content.trim());
    if (!textCheck.safe) {
      return res.status(400).json({ error: textCheck.reason });
    }

    const query = `
      UPDATE community_alerts 
      SET content = $1, is_edited = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 
      RETURNING *;
    `;
    const { rows } = await db.query(query, [content.trim(), id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Alert not found." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error editing alert:", err.message);
    res.status(500).json({ error: "Server error updating alert." });
  }
});

// PATCH: Admin stock-reason moderation removal
router.patch("/:id/moderate", boardRequired, async (req, res) => {
  const { id } = req.params;
  const { removal_reason } = req.body;
  const replacementText = "[This alert has been removed by an admin for violating community guidelines.]";

  try {
    const query = `
      UPDATE community_alerts 
      SET is_removed = true, 
          removal_reason = $1,
          content = $2,
          image_url = NULL
      WHERE id = $3 
      RETURNING *;
    `;
    const { rows } = await db.query(query, [removal_reason || "Violates community guidelines", replacementText, id]);

    if (rows.length === 0) return res.status(404).json({ error: "Alert not found." });
    res.json({ success: true, item: rows[0] });
  } catch (err) {
    console.error("Moderation error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;