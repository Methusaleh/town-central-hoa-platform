const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../db");
const { authRequired, boardRequired } = require("../middleware/auth");
const { uploadToR2 } = require("../utils/s3Storage");
const { checkImageSafety, checkImageBuffer } = require("../utils/safetyFilter");

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

function parseGallery(raw) {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw
    : (() => {
        try {
          return JSON.parse(raw);
        } catch {
          return [];
        }
      })();
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (typeof item === "string" && item) return { url: item };
      if (item && item.url) return { url: item.url, name: item.name || "" };
      return null;
    })
    .filter(Boolean);
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
  const bufferCheck = await checkImageBuffer(file.buffer, file.mimetype, file.originalname);
  if (!bufferCheck.safe) {
    const err = new Error(bufferCheck.reason || "Image did not pass safety checks.");
    err.status = 400;
    throw err;
  }
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
  const shaped = {
    ...row,
    event_type: normalizeType(row.event_type, row.category),
    details: parseDetails(row.details),
    gallery: parseGallery(row.gallery),
    cancelled_at: row.cancelled_at || null,
    rsvp_count: extras.rsvp_count ?? row.rsvp_count ?? 0,
    going: extras.going ?? Boolean(row.going),
  };
  if (extras.rsvps !== undefined) shaped.rsvps = extras.rsvps;
  return shaped;
}

async function resolveEventMedia(body, files, existing = {}) {
  const coverFile = files.cover?.[0];
  const attachmentFile = files.attachment?.[0];
  let coverUrl = existing.cover_url || body.cover_url || null;
  let attachmentUrl = existing.attachment_url || body.attachment_url || null;
  let attachmentName = existing.attachment_name || body.attachment_name || null;

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

  return { coverUrl, attachmentUrl, attachmentName };
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
      SELECT r.display_name, u.profile_photo AS photo
      FROM event_rsvps r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.event_id = $1
      ORDER BY r.created_at ASC
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
    const eventRes = await db.query(
      "SELECT id, cancelled_at FROM neighborhood_events WHERE id = $1",
      [req.params.id],
    );
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ error: "Event not found." });
    }
    if (eventRes.rows[0].cancelled_at) {
      return res.status(400).json({ error: "This event was cancelled." });
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
      `SELECT r.display_name, u.profile_photo AS photo
       FROM event_rsvps r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.event_id = $1
       ORDER BY r.created_at ASC`,
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
    const { coverUrl, attachmentUrl, attachmentName } = await resolveEventMedia(
      req.body,
      req.files || {},
    );

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

router.patch("/:id", boardRequired, media, async (req, res) => {
  const { title, event_date, event_time, location, description, category, event_type } = req.body;

  if (!title || !event_date) {
    return res.status(400).json({ error: "Title and event date are required fields." });
  }

  try {
    const existing = await db.query("SELECT * FROM neighborhood_events WHERE id = $1", [
      req.params.id,
    ]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Event not found." });
    }

    const type = normalizeType(event_type, category);
    const details = parseDetails(req.body.details);
    const { coverUrl, attachmentUrl, attachmentName } = await resolveEventMedia(
      req.body,
      req.files || {},
      existing.rows[0],
    );

    const { rows } = await db.query(
      `
      UPDATE neighborhood_events SET
        title = $1,
        event_date = $2,
        event_time = $3,
        location = $4,
        description = $5,
        category = $6,
        attachment_url = $7,
        attachment_name = $8,
        event_type = $9,
        cover_url = $10,
        details = $11::jsonb
      WHERE id = $12
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
        req.params.id,
      ],
    );

    res.json(shapeEvent(rows[0]));
  } catch (err) {
    console.error("Event update error:", err.message);
    res.status(err.status || 500).json({ error: err.message || "Server error while updating event." });
  }
});

router.patch("/:id/cancel", boardRequired, async (req, res) => {
  try {
    const { rows } = await db.query(
      `
      UPDATE neighborhood_events
         SET cancelled_at = COALESCE(cancelled_at, NOW())
       WHERE id = $1
       RETURNING *;
    `,
      [req.params.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Event not found." });
    }
    res.json(shapeEvent(rows[0]));
  } catch (err) {
    console.error("Event cancel error:", err.message);
    res.status(500).json({ error: "Couldn't cancel that event." });
  }
});

const photosUpload = upload.array("photos", 12);

router.post("/:id/photos", boardRequired, photosUpload, async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ error: "Add at least one photo." });
    }

    const existing = await db.query("SELECT id, gallery FROM neighborhood_events WHERE id = $1", [
      req.params.id,
    ]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Event not found." });
    }

    const current = parseGallery(existing.rows[0].gallery);
    if (current.length + files.length > 40) {
      return res.status(400).json({ error: "This event already has as many photos as it can hold." });
    }

    const added = [];
    for (const file of files) {
      if (!String(file.mimetype || "").startsWith("image/")) {
        return res.status(400).json({ error: "Recap photos need to be images." });
      }
      added.push({ url: await uploadSafeImage(file), name: file.originalname });
    }

    const { rows } = await db.query(
      `
      UPDATE neighborhood_events
         SET gallery = COALESCE(gallery, '[]'::jsonb) || $1::jsonb
       WHERE id = $2
       RETURNING *;
    `,
      [JSON.stringify(added), req.params.id],
    );

    res.json(shapeEvent(rows[0]));
  } catch (err) {
    console.error("Event photos error:", err.message);
    res.status(err.status || 500).json({ error: err.message || "Couldn't save those photos." });
  }
});

module.exports = router;
