const express = require("express");
const router = express.Router();
const db = require("../db");

// 1. GET: Fetch all categories
router.get("/categories", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM document_categories ORDER BY name ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. POST: Add a new category
router.post("/categories", async (req, res) => {
  const { name } = req.body;
  try {
    const query = "INSERT INTO document_categories (name) VALUES ($1) RETURNING *";
    const { rows } = await db.query(query, [name]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET: All documents
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM documents ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. POST: Add a new document
router.post("/", async (req, res) => {
  const { title, file_url, category_id, is_private, requires_board_key, uploaded_by } = req.body;
  try {
    const query = `
      INSERT INTO documents (title, file_url, category_id, is_private, requires_board_key, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const { rows } = await db.query(query, [title, file_url, category_id, is_private, requires_board_key, uploaded_by]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;