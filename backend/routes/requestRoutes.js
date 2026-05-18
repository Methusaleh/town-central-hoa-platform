const express = require("express");
const router = express.Router();
const db = require("../db");

// POST a new maintenance or ARC request
router.post("/", async (req, res) => {
  try {
    const { resident_id, first_name, last_name, type, subject, description } =
      req.body;

    const query = `
      INSERT INTO community_requests (resident_id, first_name, last_name, request_type, subject, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [
      resident_id || null,
      first_name,
      last_name,
      type,
      subject,
      description,
    ];
    const { rows } = await db.query(query, values);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error while submitting request" });
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
  const { adminName } = req.body; // Capture who is resolving it

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
