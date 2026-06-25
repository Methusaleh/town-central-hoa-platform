const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../db");
const { uploadToR2 } = require("../utils/s3Storage");

// Tell multer to hold the incoming file in memory temporarily (max 5MB)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } 
});

// GET: Fetch all categories
router.get("/categories", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM document_categories ORDER BY name ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Add a new category
router.post("/categories", async (req, res) => {
  const { name } = req.body;
  try {
    const { rows } = await db.query("INSERT INTO document_categories (name) VALUES ($1) RETURNING *", [name]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: All documents
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM documents ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Upload a physical document (Notice the upload.single("file") middleware)
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { title, category_id, is_private, requires_board_key, uploaded_by } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: "No file was attached to the request." });
    }

    // 1. Ship the physical file off to Cloudflare R2
    const publicFileUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);

    // 2. Save the new Cloudflare URL straight into Postgres
    const query = `
      INSERT INTO documents (title, file_url, category_id, is_private, requires_board_key, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    
    const { rows } = await db.query(query, [
      title, 
      publicFileUrl, 
      category_id, 
      is_private === "true" || is_private === true, 
      requires_board_key === "true" || requires_board_key === true, 
      uploaded_by || null
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;