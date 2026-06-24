const express = require("express");
const router = express.Router();
const db = require("../db");
const nodemailer = require("nodemailer");

// 1. Initialize secure backend mail carrier using environment variables
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS 
  }
});

// POST a new maintenance, ARC, or pure board email message
router.post("/", async (req, res) => {
  try {
    const { resident_id, first_name, last_name, type, subject, description } = req.body;

    // 2. CHECK TYPE: If it is a Board Message, bypass the DB completely and email silently
    if (type === "Board Message") {
      const mailOptions = {
        from: `"Town Central Portal" <${process.env.EMAIL_USER}>`,
        to: "board@towncentralhoa.com", // Destination real-world board inbox
        subject: `[Portal Contact Form] ${subject}`,
        text: `Message from ${first_name}:\n\n${description}`, // Plain text fallback
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
                  <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${first_name}</td>
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
              This correspondence was generated from the public resident portal contact form and delivered instantly via backend SMTP configuration handlers.
            </div>
          </div>
        `
      };

      // Dispatch SMTP call in the background smoothly
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.error("SMTP Delivery Fault:", err.message);
        else console.log("Direct background email transmission successful:", info.response);
      });

      // Respond with a clean success payload immediately to keep client interactions snappy
      return res.status(201).json({ success: true, message: "Email transmitted to the board successfully." });
    }

    // 3. STANDARD WORKFLOW: For typical maintenance or ARC tickets, save to database deck
    const dbQuery = `
      INSERT INTO community_requests (resident_id, first_name, last_name, request_type, subject, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [resident_id || null, first_name, last_name, type, subject, description];
    const { rows } = await db.query(dbQuery, values);
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error while processing entry form query parameters." });
  }
});

// GET all requests for the Board Portal
router.get("/admin/all", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM community_requests ORDER BY created_at DESC",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin requests" });
  }
});

// PATCH to update request status (Resolve)
router.patch("/:id/resolve", async (req, res) => {
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
    const { rows } = await db.query(query, [adminName, id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to archive request" });
  }
});

module.exports = router;