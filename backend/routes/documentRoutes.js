const express = require("express");
const router = express.Router();
const db = require("../db");

// GET: All documents (Filter by board access if needed)
router.get("/", async (req, res) => {
  try {
    // Basic SELECT: You can add logic here to filter where requires_board_key is false for residents
    const { rows } = await db.query("SELECT * FROM documents ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Add a new document (Board Only)
router.post("/", async (req, res) => {
  const { title, file_url, is_private, requires_board_key, uploaded_by } = req.body;
  try {
    const query = `
      INSERT INTO documents (title, file_url, is_private, requires_board_key, uploaded_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const { rows } = await db.query(query, [title, file_url, is_private, requires_board_key, uploaded_by]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;