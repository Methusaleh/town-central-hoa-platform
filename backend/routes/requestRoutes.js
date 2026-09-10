const express = require("express");
const router = express.Router();
const db = require("../db");
const { sendMail } = require("../utils/mailer");
const { authRequired, boardRequired, isBoard } = require("../middleware/auth");
const { uploadToR2 } = require("../utils/s3Storage");

const TYPE_MAP = { arc: "home_change" };
const ALLOWED_TYPES = new Set(["maintenance", "home_change"]);

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeType(type) {
  const raw = String(type || "").trim();
  const mapped = TYPE_MAP[raw] || raw;
  return ALLOWED_TYPES.has(mapped) ? mapped : mapped;
}

function isBoardLogged(ticket) {
  return ticket?.source === "board" || ticket?.request_type === "board_note";
}

function serializeComment(row) {
  return {
    id: row.id,
    request_id: row.request_id,
    author_id: row.author_id,
    author_name: row.author_name,
    body: row.body,
    visibility: row.visibility,
    created_at: row.created_at,
  };
}

async function commentsByRequestIds(ids, { includeBoard }) {
  if (!ids.length) return new Map();
  const { rows } = await db.query(
    `SELECT id, request_id, author_id, author_name, body, visibility, created_at
       FROM request_comments
      WHERE request_id = ANY($1::int[])
        AND ($2::boolean OR visibility = 'household')
      ORDER BY created_at ASC, id ASC`,
    [ids, Boolean(includeBoard)],
  );
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.request_id) || [];
    list.push(serializeComment(row));
    map.set(row.request_id, list);
  }
  return map;
}

async function withComments(tickets, opts) {
  const map = await commentsByRequestIds(
    tickets.map((ticket) => ticket.id),
    opts,
  );
  return tickets.map((ticket) => ({ ...ticket, comments: map.get(ticket.id) || [] }));
}

async function authorNameFor(userId) {
  const { rows } = await db.query(
    `SELECT first_name, last_name, email FROM users WHERE id = $1`,
    [userId],
  );
  const person = rows[0];
  return (
    [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim() ||
    person?.email ||
    "Neighbor"
  );
}

// POST a new maintenance, home-change, or board contact message
router.post("/", authRequired, async (req, res) => {
  try {
    const { resident_id, first_name, last_name, type, subject, description } = req.body;
    const requestType = type === "Board Message" ? type : normalizeType(type);

    if (type === "Board Message") {
      const senderEmail = req.user?.email || "";
      const senderAddress = req.user?.address || "";
      const senderName = [first_name, last_name].filter(Boolean).join(" ").trim() || "Neighbor";
      const mailed = await sendMail({
        to: "board@towncentralhoa.org",
        replyTo: senderEmail || undefined,
        subject: `[Portal Contact Form] ${subject}`,
        text: [
          `Message from ${senderName}`,
          senderEmail ? `Email: ${senderEmail}` : "",
          senderAddress ? `Address: ${senderAddress}` : "",
          "",
          description,
        ]
          .filter((line) => line !== "")
          .join("\n"),
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="background-color: #2c3e50; padding: 24px; text-align: center; color: white;">
              <h2 style="margin: 0; font-size: 1.5rem; letter-spacing: 0.5px;">General Board Correspondence</h2>
              <span style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: #2ecc71; font-weight: bold;">Town Central HOA Portal</span>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.9rem;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 120px;">Sender Resident:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${escapeHtml(senderName)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Email:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${escapeHtml(senderEmail || "Not on file")}</td>
                </tr>
                ${
                  senderAddress
                    ? `<tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Address:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${escapeHtml(senderAddress)}</td>
                </tr>`
                    : ""
                }
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Subject:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${escapeHtml(subject)}</td>
                </tr>
              </table>
              <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
              <p style="color: #475569; font-size: 0.95rem; line-height: 1.6; margin: 0; background-color: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #2ecc71; white-space: pre-wrap;">
                ${escapeHtml(description)}
              </p>
            </div>
            <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #f1f5f9;">
              ${senderEmail ? `Reply goes to ${escapeHtml(senderEmail)}.` : "No reply-to address was on this neighbor's account."}
            </div>
          </div>
        `,
      });

      if (mailed?.skipped) {
        return res.status(503).json({
          error:
            "Mail isn't set up on the server right now, so this note was not sent. Email the board at board@towncentralhoa.org, or try again after mail is configured.",
        });
      }

      return res.status(201).json({ success: true, message: "Email transmitted to the board successfully." });
    }

    // STANDARD WORKFLOW: Save repair and house-change tickets
    const dbQuery = `
      INSERT INTO community_requests (resident_id, first_name, last_name, request_type, subject, description, status, source, street_address)
      VALUES ($1, $2, $3, $4, $5, $6, 'Open', 'resident', $7)
      RETURNING *;
    `;
    const values = [
      req.user?.id || resident_id || null,
      first_name,
      last_name || "",
      requestType,
      subject,
      description,
      req.user?.address || null,
    ];
    const { rows } = await db.query(dbQuery, values);
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error while processing entry form query parameters." });
  }
});

router.get("/mine", authRequired, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM community_requests
        WHERE resident_id = $1
          AND COALESCE(source, 'resident') <> 'board'
          AND COALESCE(request_type, '') <> 'board_note'
        ORDER BY created_at DESC`,
      [req.user.id],
    );
    res.json(await withComments(rows, { includeBoard: false }));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch your requests" });
  }
});

// GET all requests for the Board Portal
router.get("/admin/all", boardRequired, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM community_requests ORDER BY created_at DESC",
    );
    res.json(await withComments(rows, { includeBoard: true }));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin requests" });
  }
});

router.post("/:id/comments", authRequired, async (req, res) => {
  const body = String(req.body.body || "").trim();
  if (!body) {
    return res.status(400).json({ error: "Write a note first." });
  }
  if (body.length > 4000) {
    return res.status(400).json({ error: "Keep that note shorter." });
  }

  try {
    const { rows } = await db.query("SELECT * FROM community_requests WHERE id = $1", [req.params.id]);
    const ticket = rows[0];
    if (!ticket) {
      return res.status(404).json({ error: "Request not found." });
    }
    if (ticket.status !== "In review") {
      return res.status(400).json({ error: "Notes open once this is in review." });
    }

    const board = isBoard(req.user);
    const boardLogged = isBoardLogged(ticket);
    const ownsTicket = Number(ticket.resident_id) === Number(req.user.id);

    if (boardLogged) {
      if (!board) {
        return res.status(403).json({ error: "Board only." });
      }
    } else if (!board && !ownsTicket) {
      return res.status(403).json({ error: "Not your ticket." });
    }

    const visibility = boardLogged ? "board" : "household";
    const authorName = await authorNameFor(req.user.id);
    const saved = await db.query(
      `INSERT INTO request_comments (request_id, author_id, author_name, body, visibility)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, request_id, author_id, author_name, body, visibility, created_at`,
      [ticket.id, req.user.id, authorName, body, visibility],
    );
    res.status(201).json(serializeComment(saved.rows[0]));
  } catch (err) {
    console.error("Request comment error:", err.message);
    res.status(500).json({ error: "Couldn't post that note." });
  }
});

// PATCH to update request status (Resolve / Close)
router.patch("/:id/resolve", boardRequired, async (req, res) => {
  const { id } = req.params;
  const { adminName } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE community_requests
          SET status = 'Resolved',
              resolved_at = CURRENT_TIMESTAMP,
              resolved_by = $1
        WHERE id = $2
        RETURNING *`,
      [adminName || "Board", id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Request not found." });
    }

    const [ticket] = await withComments(rows, { includeBoard: true });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: "Failed to archive request" });
  }
});

router.patch("/:id/update", boardRequired, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE community_requests
          SET status = COALESCE($1, status)
        WHERE id = $2
        RETURNING *`,
      [status || null, id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Request not found." });
    }

    const [ticket] = await withComments(rows, { includeBoard: true });
    res.json(ticket);
  } catch (err) {
    console.error("Error updating request tracking:", err.message);
    res.status(500).json({ error: "Failed to update ticket parameters." });
  }
});

router.post("/log", boardRequired, async (req, res) => {
  const subject = String(req.body.subject || "").trim();
  const description = String(req.body.description || "").trim();
  const street = String(req.body.street_address || "").trim();
  const neighborName = String(req.body.neighbor_name || "").trim() || "Neighbor";
  const loggedBy = String(req.body.admin_name || "").trim() || "Board";

  if (!subject || !description) {
    return res.status(400).json({ error: "Add a short subject and what was said." });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO community_requests
        (resident_id, first_name, last_name, request_type, subject, description, status, source, street_address, board_note)
       VALUES (NULL, $1, '', 'board_note', $2, $3, 'Open', 'board', $4, $5)
       RETURNING *`,
      [neighborName, subject, description, street || null, `Logged by ${loggedBy}`],
    );
    const [ticket] = await withComments(rows, { includeBoard: true });
    res.status(201).json(ticket);
  } catch (err) {
    console.error("Board log error:", err.message);
    res.status(500).json({ error: "Couldn't save that interaction." });
  }
});

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

router.post("/admin/archive-export", boardRequired, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT *
         FROM community_requests
        WHERE status = 'Resolved'
          AND resolved_at IS NOT NULL
          AND resolved_at < NOW() - INTERVAL '24 months'
        ORDER BY resolved_at ASC`,
    );

    const commentMap = await commentsByRequestIds(
      rows.map((row) => row.id),
      { includeBoard: true },
    );
    const header = [
      "id",
      "created_at",
      "resolved_at",
      "status",
      "source",
      "request_type",
      "street_address",
      "name",
      "subject",
      "description",
      "board_note",
      "thread",
      "resolved_by",
    ];
    const body = rows.map((row) => [
      row.id,
      row.created_at,
      row.resolved_at,
      row.status,
      row.source || "resident",
      row.request_type,
      row.street_address || "",
      `${row.first_name || ""} ${row.last_name || ""}`.trim(),
      row.subject,
      row.description,
      row.board_note,
      (commentMap.get(row.id) || [])
        .map((comment) => `${comment.author_name}: ${comment.body}`)
        .join(" | "),
      row.resolved_by,
    ]);
    const csv = [header, ...body].map((line) => line.map(csvEscape).join(",")).join("\n");
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `operations-archive-${stamp}.csv`;
    const fileUrl = await uploadToR2(Buffer.from(csv, "utf8"), filename, "text/csv");

    let folderId = null;
    const existing = await db.query(
      `SELECT id FROM document_categories
        WHERE name = 'Operations archive' AND COALESCE(audience, 'residents') = 'board'
        LIMIT 1`,
    );
    if (existing.rows[0]) {
      folderId = existing.rows[0].id;
    } else {
      const created = await db.query(
        `INSERT INTO document_categories (name, parent_id, audience)
         VALUES ('Operations archive', NULL, 'board')
         RETURNING id`,
      );
      folderId = created.rows[0].id;
    }

    const title = `Operations archive ${stamp}`;
    const saved = await db.query(
      `INSERT INTO documents (title, file_url, category_id, is_private, requires_board_key, uploaded_by)
       VALUES ($1, $2, $3, true, true, $4)
       RETURNING *`,
      [title, fileUrl, folderId, req.user?.id || null],
    );

    res.json({
      success: true,
      count: rows.length,
      document: saved.rows[0],
      message:
        rows.length === 0
          ? "Saved an empty archive file to Board documents so the folder exists."
          : `Filed ${rows.length} resolved ticket${rows.length === 1 ? "" : "s"} older than 24 months to Board documents.`,
    });
  } catch (err) {
    console.error("Archive export error:", err.message);
    res.status(500).json({ error: "Couldn't file that archive." });
  }
});

module.exports = router;