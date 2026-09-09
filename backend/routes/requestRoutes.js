const express = require("express");
const router = express.Router();
const db = require("../db");
const { sendMail } = require("../utils/mailer");
const { authRequired, boardRequired } = require("../middleware/auth");

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
      INSERT INTO community_requests (resident_id, first_name, last_name, request_type, subject, description, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'Open')
      RETURNING *;
    `;
    const values = [req.user?.id || resident_id || null, first_name, last_name || "", requestType, subject, description];
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
        ORDER BY created_at DESC`,
      [req.user.id],
    );
    res.json(rows);
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
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin requests" });
  }
});

// PATCH to update request status (Resolve / Close)
router.patch("/:id/resolve", boardRequired, async (req, res) => {
  const { id } = req.params;
  const { adminName, board_note } = req.body;

  try {
    const query = `
      UPDATE community_requests 
      SET status = 'Resolved', 
          resolved_at = CURRENT_TIMESTAMP,
          resolved_by = $1,
          board_note = COALESCE($3, board_note)
      WHERE id = $2 
      RETURNING *;
    `;
    const { rows } = await db.query(query, [adminName || "Board", id, board_note || null]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Request not found." });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to archive request" });
  }
});

// PATCH to update status or append replies/notes to a ticket
router.patch("/:id/update", boardRequired, async (req, res) => {
  const { id } = req.params;
  const { status, board_note } = req.body;

  try {
    const query = `
      UPDATE community_requests 
      SET status = COALESCE($1, status),
          board_note = COALESCE($2, board_note)
      WHERE id = $3 
      RETURNING *;
    `;
    const { rows } = await db.query(query, [status || null, board_note || null, id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Request not found." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error updating request tracking:", err.message);
    res.status(500).json({ error: "Failed to update ticket parameters." });
  }
});

module.exports = router;