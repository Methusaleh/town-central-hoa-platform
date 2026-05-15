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

module.exports = router;
