const express = require("express");
const router = express.Router();
const db = require("../db");
const { sendMail } = require("../utils/mailer");
const { authRequired, boardRequired } = require("../middleware/auth");

// POST a new maintenance, ARC, or board contact message
router.post("/", authRequired, async (req, res) => {
  try {
    const { resident_id, first_name, last_name, type, subject, description } = req.body;

    // 2. CHECK TYPE: If it is a direct Board Message, email it silently
    if (type === "Board Message") {
      await sendMail({
        to: "board@towncentralhoa.org",
        subject: `[Portal Contact Form] ${subject}`,
        text: `Message from ${first_name}:\n\n${description}`,
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
                  <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${first_name} ${last_name || ""}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Subject:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${subject}</td>
                </tr>
              </table>
              <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
              <p style="color: #475569; font-size: 0.95rem; line-height: 1.6; margin: 0; background-color: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #2ecc71;">
                ${description}
              </p>
            </div>
            <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #f1f5f9;">
              Delivered securely via Town Central Zoho SMTP handlers.
            </div>
          </div>
        `
      });

      return res.status(201).json({ success: true, message: "Email transmitted to the board successfully." });
    }

    // 3. STANDARD WORKFLOW: Save maintenance or ARC tickets directly to the site database
    const dbQuery = `
      INSERT INTO community_requests (resident_id, first_name, last_name, request_type, subject, description, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'Open')
      RETURNING *;
    `;
    const values = [req.user?.id || resident_id || null, first_name, last_name || "", type, subject, description];
    const { rows } = await db.query(dbQuery, values);
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error while processing entry form query parameters." });
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
  const { adminName } = req.body;

  try {
    const query = `
      UPDATE community_requests 
      SET status = 'Resolved', 
          resolved_at = CURRENT_TIMESTAMP,
          resolved_by = $1
      WHERE id = $2 
      RETURNING *;
    `;
    const { rows } = await db.query(query, [adminName || "Admin", id]);
    
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
  const { status, admin_notes } = req.body;

  try {
    const query = `
      UPDATE community_requests 
      SET status = COALESCE($1, status),
          description = CASE WHEN $2::text IS NOT NULL THEN description || E'\n\n[Admin Note]: ' || $2 ELSE description END
      WHERE id = $3 
      RETURNING *;
    `;
    const { rows } = await db.query(query, [status, admin_notes, id]);

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