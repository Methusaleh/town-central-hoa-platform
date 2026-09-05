const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../db");
const { authRequired, boardRequired } = require("../middleware/auth");
const { uploadToR2 } = require("../utils/s3Storage");
const { checkImageSafety } = require("../utils/safetyFilter");

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
const media = upload.fields([
  { name: "cover", maxCount: 1 },
  { name: "attachment", maxCount: 1 },
]);

const EVENT_TYPES = ["gathering", "cookout", "kids", "meeting", "pool"];

function parseDetails(raw) {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeType(value, category) {
  const v = String(value || "").toLowerCase().trim();
  if (EVENT_TYPES.includes(v)) return v;
  const c = String(category || "").toLowerCase();
  if (c.includes("meet")) return "meeting";
  if (c.includes("pool")) return "pool";
  if (c.includes("kid") || c.includes("youth")) return "kids";
  if (c.includes("cook") || c.includes("bbq")) return "cookout";
  return "gathering";
}

async function uploadSafeImage(file) {
  if (!file) return null;
  const url = await uploadToR2(file.buffer, file.originalname, file.mimetype);
  const check = await checkImageSafety(url);
  if (!check.safe) {
    const err = new Error(check.reason || "Image did not pass safety checks.");
    err.status = 400;
    throw err;
  }
  return url;
}

function shapeEvent(row, extras = {}) {
  return {
    ...row,
    event_type: normalizeType(row.event_type, row.category),
    details: parseDetails(row.details),
    rsvp_count: extras.rsvp_count ?? row.rsvp_count ?? 0,
    going: extras.going ?? Boolean(row.going),
    rsvps: extras.rsvps,
  };
}

router.get("/", authRequired, async (req, res) => {
  try {
    const { rows } = await db.query(
      `
      SELECT e.*,
        COALESCE(c.n, 0)::int AS rsvp_count,
        CASE WHEN mine.user_id IS NULL THEN false ELSE true END AS going
      FROM neighborhood_events e
      LEFT JOIN (
        SELECT event_id, COUNT(*)::int AS n FROM event_rsvps GROUP BY event_id
      ) c ON c.event_id = e.id
      LEFT JOIN event_rsvps mine
        ON mine.event_id = e.id AND mine.user_id = $1
      ORDER BY e.event_date ASC, e.event_time ASC NULLS LAST
    `,
      [req.user.id],
    );
    res.json(rows.map((row) => shapeEvent(row)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", authRequired, async (req, res) => {
  try {
    const { rows } = await db.query(
      `
      SELECT e.*,
        COALESCE(c.n, 0)::int AS rsvp_count,
        CASE WHEN mine.user_id IS NULL THEN false ELSE true END AS going
      FROM neighborhood_events e
      LEFT JOIN (
        SELECT event_id, COUNT(*)::int AS n FROM event_rsvps GROUP BY event_id
      ) c ON c.event_id = e.id
      LEFT JOIN event_rsvps mine
        ON mine.event_id = e.id AND mine.user_id = $2
      WHERE e.id = $1
    `,
      [req.params.id, req.user.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Event not found." });
    }

    const rsvps = await db.query(
      `
      SELECT display_name
      FROM event_rsvps
      WHERE event_id = $1
      ORDER BY created_at ASC
    `,
      [req.params.id],
    );

    res.json(shapeEvent(rows[0], { rsvps: rsvps.rows }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/rsvp", authRequired, async (req, res) => {
  try {
    const eventRes = await db.query("SELECT id FROM neighborhood_events WHERE id = $1", [
      req.params.id,
    ]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ error: "Event not found." });
    }

    const existing = await db.query(
      "SELECT id FROM event_rsvps WHERE event_id = $1 AND user_id = $2",
      [req.params.id, req.user.id],
    );

    if (existing.rows.length > 0) {
      await db.query("DELETE FROM event_rsvps WHERE id = $1", [existing.rows[0].id]);
    } else {
      const userRes = await db.query("SELECT first_name FROM users WHERE id = $1", [req.user.id]);
      const displayName = userRes.rows[0]?.first_name || "Neighbor";
      await db.query(
        "INSERT INTO event_rsvps (event_id, user_id, display_name) VALUES ($1, $2, $3)",
        [req.params.id, req.user.id, displayName],
      );
    }

    const countRes = await db.query(
      "SELECT COUNT(*)::int AS n FROM event_rsvps WHERE event_id = $1",
      [req.params.id],
    );
    const names = await db.query(
      "SELECT display_name FROM event_rsvps WHERE event_id = $1 ORDER BY created_at ASC",
      [req.params.id],
    );

    res.json({
      going: existing.rows.length === 0,
      rsvp_count: countRes.rows[0].n,
      rsvps: names.rows,
    });
  } catch (err) {
    console.error("RSVP error:", err.message);
    res.status(500).json({ error: "Server error saving RSVP." });
  }
});

router.post("/", boardRequired, media, async (req, res) => {
  const { title, event_date, event_time, location, description, category, event_type } = req.body;

  if (!title || !event_date) {
    return res.status(400).json({ error: "Title and event date are required fields." });
  }

  try {
    const type = normalizeType(event_type, category);
    const details = parseDetails(req.body.details);
    const files = req.files || {};
    const coverFile = files.cover?.[0];
    const attachmentFile = files.attachment?.[0];

    let coverUrl = req.body.cover_url || null;
    let attachmentUrl = req.body.attachment_url || null;
    let attachmentName = req.body.attachment_name || null;

    if (coverFile) {
      coverUrl = await uploadSafeImage(coverFile);
    }
    if (attachmentFile) {
      const isImage = String(attachmentFile.mimetype || "").startsWith("image/");
      attachmentUrl = isImage
        ? await uploadSafeImage(attachmentFile)
        : await uploadToR2(
            attachmentFile.buffer,
            attachmentFile.originalname,
            attachmentFile.mimetype,
          );
      attachmentName = attachmentFile.originalname;
      if (!coverUrl && isImage) coverUrl = attachmentUrl;
    }

    const { rows } = await db.query(
      `
      INSERT INTO neighborhood_events (
        title, event_date, event_time, location, description, category,
        attachment_url, attachment_name, event_type, cover_url, details
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
      RETURNING *;
    `,
      [
        title.trim(),
        event_date,
        event_time || null,
        location || null,
        description || null,
        type,
        attachmentUrl,
        attachmentName,
        type,
        coverUrl,
        JSON.stringify(details),
      ],
    );

    res.status(201).json(shapeEvent(rows[0], { rsvp_count: 0, going: false, rsvps: [] }));
  } catch (err) {
    console.error("Event creation error:", err.message);
    res.status(err.status || 500).json({ error: err.message || "Server error while posting event." });
  }
});

module.exports = router;
