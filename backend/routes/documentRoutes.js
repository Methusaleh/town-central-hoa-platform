const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../db");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { s3, uploadToR2 } = require("../utils/s3Storage");
const { authRequired, boardRequired, isBoard } = require("../middleware/auth");

const MAX_FILE_BYTES = 25 * 1024 * 1024;

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES },
});

function asAudience(value) {
  return value === "board" ? "board" : "residents";
}

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

async function getFolder(id) {
  if (!id) return null;
  const { rows } = await db.query("SELECT * FROM document_categories WHERE id = $1", [id]);
  return rows[0] || null;
}

async function descendantFolderIds(id) {
  const { rows } = await db.query(
    `WITH RECURSIVE tree AS (
       SELECT id FROM document_categories WHERE id = $1
       UNION ALL
       SELECT child.id
         FROM document_categories child
         JOIN tree ON child.parent_id = tree.id
     )
     SELECT id FROM tree`,
    [id],
  );
  return rows.map((row) => row.id);
}

async function applyAudience(folderId, audience) {
  const ids = await descendantFolderIds(folderId);
  if (ids.length === 0) return;
  const boardOnly = audience === "board";
  await db.query(`UPDATE document_categories SET audience = $1 WHERE id = ANY($2::int[])`, [
    audience,
    ids,
  ]);
  await db.query(
    `UPDATE documents
        SET is_private = $1, requires_board_key = $1
      WHERE category_id = ANY($2::int[])`,
    [boardOnly, ids],
  );
}

function runUpload(req, res, next) {
  upload.any()(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Each file needs to be 25 MB or smaller." });
    }
    return res.status(400).json({ error: err.message || "Upload failed." });
  });
}

router.get("/categories", authRequired, async (req, res) => {
  try {
    const publicOnly = !isBoard(req.user) || req.query.audience === "residents";
    const sql = publicOnly
      ? `SELECT * FROM document_categories
         WHERE COALESCE(audience, 'residents') <> 'board'
         ORDER BY name ASC`
      : "SELECT * FROM document_categories ORDER BY name ASC";
    const { rows } = await db.query(sql);
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
    let audience = asAudience(req.body.audience);
    if (parent_id) {
      const parent = await getFolder(parent_id);
      if (!parent) return res.status(404).json({ error: "Parent folder not found." });
      audience = asAudience(parent.audience);
    }

    const { rows } = await db.query(
      "INSERT INTO document_categories (name, parent_id, audience) VALUES ($1, $2, $3) RETURNING *",
      [name.trim(), parent_id || null, audience],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/categories/:id", boardRequired, async (req, res) => {
  const { name, parent_id, audience } = req.body;
  const id = req.params.id;

  if (name !== undefined && (!name || !name.trim())) {
    return res.status(400).json({ error: "Folder name is required." });
  }

  try {
    const current = await getFolder(id);
    if (!current) return res.status(404).json({ error: "Folder not found." });

    if (parent_id !== undefined && parent_id !== null && String(parent_id) === String(id)) {
      return res.status(400).json({ error: "A folder cannot be moved into itself." });
    }

    if (parent_id) {
      let cursor = parent_id;
      const seen = new Set();
      while (cursor) {
        if (String(cursor) === String(id) || seen.has(String(cursor))) {
          return res.status(400).json({ error: "Cannot move a folder into one of its descendants." });
        }
        seen.add(String(cursor));
        const { rows } = await db.query("SELECT parent_id FROM document_categories WHERE id = $1", [cursor]);
        cursor = rows[0]?.parent_id || null;
      }
    }

    const sets = [];
    const vals = [];
    let i = 1;
    if (name !== undefined) {
      sets.push(`name = $${i++}`);
      vals.push(name.trim());
    }
    if (parent_id !== undefined) {
      sets.push(`parent_id = $${i++}`);
      vals.push(parent_id || null);
    }

    let nextAudience = current.audience || "residents";
    if (audience !== undefined) {
      nextAudience = asAudience(audience);
    } else if (parent_id) {
      const parent = await getFolder(parent_id);
      nextAudience = asAudience(parent?.audience);
    }

    if (nextAudience !== (current.audience || "residents")) {
      sets.push(`audience = $${i++}`);
      vals.push(nextAudience);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: "No folder updates provided." });
    }
    vals.push(id);
    const { rows } = await db.query(
      `UPDATE document_categories SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      vals,
    );
    if (nextAudience !== (current.audience || "residents")) {
      await applyAudience(id, nextAudience);
    }
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
    const publicOnly = !isBoard(req.user) || req.query.audience === "residents";
    if (publicOnly) {
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

router.post("/", boardRequired, runUpload, async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: "No file was attached to the request." });
    }

    const { category_id } = req.body;
    let privateFlag = req.body.is_private === "true" || req.body.is_private === true;
    if (req.body.is_private === undefined) {
      if (category_id) {
        const folder = await getFolder(category_id);
        privateFlag = asAudience(folder?.audience) === "board";
      } else {
        privateFlag = asAudience(req.body.audience) === "board";
      }
    }

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
        privateFlag,
        privateFlag,
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

router.patch("/:id", boardRequired, async (req, res) => {
  const { title, category_id, is_private, audience } = req.body;
  const sets = [];
  const vals = [];
  let i = 1;

  if (title !== undefined) {
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "File name is required." });
    }
    sets.push(`title = $${i++}`);
    vals.push(title.trim());
  }
  if (category_id !== undefined) {
    sets.push(`category_id = $${i++}`);
    vals.push(category_id || null);
  }

  let privateFlag;
  if (is_private !== undefined) {
    privateFlag = is_private === true || is_private === "true";
  } else if (audience !== undefined) {
    privateFlag = asAudience(audience) === "board";
  } else if (category_id) {
    const folder = await getFolder(category_id);
    privateFlag = asAudience(folder?.audience) === "board";
  }

  if (privateFlag !== undefined) {
    sets.push(`is_private = $${i++}`);
    vals.push(privateFlag);
    sets.push(`requires_board_key = $${i++}`);
    vals.push(privateFlag);
  }

  if (sets.length === 0) {
    return res.status(400).json({ error: "No file updates provided." });
  }

  try {
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE documents SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      vals,
    );
    if (rows.length === 0) return res.status(404).json({ error: "Document not found" });
    res.json(rows[0]);
  } catch (err) {
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
