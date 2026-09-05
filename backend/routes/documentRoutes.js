const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../db");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { s3, uploadToR2 } = require("../utils/s3Storage");
const { authRequired, boardRequired, isBoard } = require("../middleware/auth");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

function fileNameFromUrl(fileUrl) {
  try {
    return decodeURIComponent(new URL(fileUrl).pathname.split("/").pop());
  } catch {
    return (fileUrl || "").split("/").pop();
  }
}

async function deleteObjectFromR2(fileUrl) {
  const fileName = fileNameFromUrl(fileUrl);
  if (!fileName) return;
  await s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: fileName,
    }),
  );
}

async function deleteCategoryRecursive(id) {
  const children = await db.query(
    "SELECT id FROM document_categories WHERE parent_id = $1",
    [id],
  );
  for (const child of children.rows) {
    await deleteCategoryRecursive(child.id);
  }

  const docs = await db.query("SELECT id, file_url FROM documents WHERE category_id = $1", [id]);
  for (const doc of docs.rows) {
    try {
      await deleteObjectFromR2(doc.file_url);
    } catch (err) {
      console.error("R2 delete warning:", err.message);
    }
    await db.query("DELETE FROM documents WHERE id = $1", [doc.id]);
  }

  await db.query("DELETE FROM document_categories WHERE id = $1", [id]);
}

router.get("/categories", authRequired, async (_req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM document_categories ORDER BY name ASC",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/categories", boardRequired, async (req, res) => {
  const { name, parent_id } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Folder name is required." });
  }

  try {
    const { rows } = await db.query(
      "INSERT INTO document_categories (name, parent_id) VALUES ($1, $2) RETURNING *",
      [name.trim(), parent_id || null],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/categories/:id", boardRequired, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Folder name is required." });
  }

  try {
    const { rows } = await db.query(
      "UPDATE document_categories SET name = $1 WHERE id = $2 RETURNING *",
      [name.trim(), req.params.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: "Folder not found." });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/categories/:id", boardRequired, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT id FROM document_categories WHERE id = $1", [
      req.params.id,
    ]);
    if (rows.length === 0) return res.status(404).json({ error: "Folder not found." });
    await deleteCategoryRecursive(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Folder delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/", authRequired, async (req, res) => {
  try {
    let sql = "SELECT * FROM documents ORDER BY created_at DESC";
    if (!isBoard(req.user)) {
      sql = `SELECT * FROM documents
             WHERE (requires_board_key = false OR requires_board_key IS NULL)
               AND (is_private = false OR is_private IS NULL)
             ORDER BY created_at DESC`;
    }
    const { rows } = await db.query(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", boardRequired, upload.any(), async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: "No file was attached to the request." });
    }

    const { category_id, is_private, requires_board_key } = req.body;
    const uploaded = [];

    for (const file of files) {
      const publicFileUrl = await uploadToR2(file.buffer, file.originalname, file.mimetype);
      const title = (req.body.title || file.originalname || "Untitled").toString();
      const query = `
        INSERT INTO documents (title, file_url, category_id, is_private, requires_board_key, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const { rows } = await db.query(query, [
        title,
        publicFileUrl,
        category_id || null,
        is_private === "true" || is_private === true,
        requires_board_key === "true" || requires_board_key === true,
        req.user?.id || null,
      ]);
      uploaded.push(rows[0]);
    }

    res.status(201).json(uploaded.length === 1 ? uploaded[0] : { documents: uploaded });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", boardRequired, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT file_url FROM documents WHERE id = $1", [
      req.params.id,
    ]);
    if (rows.length === 0) return res.status(404).json({ error: "Document not found" });

    try {
      await deleteObjectFromR2(rows[0].file_url);
    } catch (err) {
      console.error("R2 delete warning:", err.message);
    }

    await db.query("DELETE FROM documents WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
