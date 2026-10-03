const express = require("express");
const multer = require("multer");
const db = require("../db");
const { authRequired, boardRequired } = require("../middleware/auth");
const { uploadToR2, deleteFromR2 } = require("../utils/s3Storage");
const { isAllowedImageType, isAllowedVideoType, checkImageBuffer } = require("../utils/safetyFilter");
const { mergeCivic, serializeCivic } = require("../utils/civicGuide");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const HOME_PHOTO_CAP = 20;
const DEFAULT_POSITION = "center 40%";
const landingUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 80 * 1024 * 1024 } });
const DEFAULT_LANDING = {
  kind: "image",
  file_url: "/landing-hero.jpg",
  object_position: "52% 72%",
};

const DEFAULT_HOME_PHOTOS = [
  { file_url: "/neighborhood/487745764_10165883224637715_2459311030547344774_n%20-%20Copy.jpg", object_position: "center 34%" },
  { file_url: "/neighborhood/506287671_10102392272565179_886039382033790342_n.jpg", object_position: "center 38%" },
  { file_url: "/neighborhood/002394cc-2f9e-4457-9b40-24d09d0ff184%20-%20Copy.jpeg", object_position: "32% 36%" },
  { file_url: "/neighborhood/517998744_10102484122676819_1454254858905645040_n%20-%20Copy.jpg", object_position: "center 46%" },
  { file_url: "/neighborhood/558537376_10102611364198789_2459993786773587574_n%20-%20Copy.jpg", object_position: "center 42%" },
  { file_url: "/neighborhood/596314415_10102706161414409_4584824806681776991_n%20-%20Copy.jpg", object_position: "58% 46%" },
  { file_url: "/neighborhood/44d69497-ff56-45aa-9a70-c801b27d4d0c%20-%20Copy.jpeg", object_position: "center 40%" },
  { file_url: "/neighborhood/490217980_10165883220297715_4165273529915380853_n%20-%20Copy.jpg", object_position: "16% 62%" },
  { file_url: "/neighborhood/517408318_10102484122492189_2003664164182829606_n%20-%20Copy.jpg", object_position: "38% 58%" },
  { file_url: "/neighborhood/558784513_10102611364258669_7770535270569882856_n%20-%20Copy.jpg", object_position: "center 22%" },
  { file_url: "/neighborhood/491353411_10165883221722715_4980306405988385281_n%20-%20Copy.jpg", object_position: "center 32%" },
  { file_url: "/neighborhood/654800275_10102868490111399_3101100244033544818_n.jpg", object_position: "center 36%" },
  { file_url: "/neighborhood/560114475_10102611364917349_4274064871914223609_n%20-%20Copy.jpg", object_position: "center 30%" },
  { file_url: "/neighborhood/490781245_10165883223577715_4974524813054671432_n%20-%20Copy.jpg", object_position: "38% 32%" },
  { file_url: "/neighborhood/491908164_10165873545587715_1511974326111052052_n.jpg", object_position: "center 38%" },
];

const DEFAULT_BOARD_CARDS = [
  {
    name: "Danelle Delp",
    title: "HOA Vice President",
    photo_url: "/board/danelle-delp.jpg",
    blurb:
      "Danelle was raised right here in Piedmont, OK. Class of 2005! Attended college at SWOSU where she met her husband Lee. They’ve been married for 15 years. Together they have a daughter Darcy, who is a third grader at Piedmont Elementary. Danelle enjoys watching their daughter play soccer, cooking with her CrocPot, traveling, getting together with friends/neighbors and Scentsy!",
  },
  {
    name: "Cole Schaffitzel",
    title: "Secretary / Treasurer",
    photo_url: "/board/cole-schaffitzel.jpg",
    blurb:
      "Cole was born and raised in Owasso, Oklahoma. After graduating from Oklahoma State University, he moved to Piedmont, where he and his wife now live. In his free time, you can find Cole racing dirt bikes, spending weekends at Grand Lake, or hanging out with his little buddies on Auburn Circle.",
  },
];

async function seedHomePhotosIfEmpty() {
  const { rows } = await db.query("SELECT id FROM home_photos LIMIT 1");
  if (rows.length) return;
  for (let i = 0; i < DEFAULT_HOME_PHOTOS.length; i += 1) {
    const photo = DEFAULT_HOME_PHOTOS[i];
    await db.query(
      `INSERT INTO home_photos (file_url, object_position, sort_order) VALUES ($1, $2, $3)`,
      [photo.file_url, photo.object_position, i],
    );
  }
}

async function seedBoardCardsIfEmpty() {
  const { rows } = await db.query("SELECT id FROM board_cards LIMIT 1");
  if (rows.length) return;
  for (let i = 0; i < DEFAULT_BOARD_CARDS.length; i += 1) {
    const card = DEFAULT_BOARD_CARDS[i];
    await db.query(
      `INSERT INTO board_cards (name, title, photo_url, blurb, sort_order) VALUES ($1, $2, $3, $4, $5)`,
      [card.name, card.title, card.photo_url, card.blurb, i],
    );
  }
}

async function listHomePhotos() {
  await seedHomePhotosIfEmpty();
  const { rows } = await db.query(
    `SELECT id, file_url, object_position, sort_order FROM home_photos ORDER BY sort_order ASC, id ASC`,
  );
  return rows;
}

async function listBoardCards() {
  await seedBoardCardsIfEmpty();
  const { rows } = await db.query(
    `SELECT id, name, title, photo_url, blurb, sort_order FROM board_cards ORDER BY sort_order ASC, id ASC`,
  );
  return rows;
}

async function scanAndUpload(file, folder = "site") {
  if (!file) return { error: "Choose a photo." };
  if (!isAllowedImageType(file.mimetype)) {
    return { error: "Use a JPEG, PNG, GIF, or WebP image." };
  }
  const scan = await checkImageBuffer(file.buffer, file.mimetype, file.originalname);
  if (!scan.safe) return { error: scan.reason || "That photo didn't pass the safety check." };
  const file_url = await uploadToR2(file.buffer, file.originalname, file.mimetype, folder);
  return { file_url };
}

router.get("/home-photos", authRequired, async (_req, res) => {
  try {
    res.json(await listHomePhotos());
  } catch (err) {
    console.error("Home photos list error:", err.message);
    res.status(500).json({ error: "Couldn't load Home photos." });
  }
});

router.post("/home-photos", boardRequired, upload.array("photos", HOME_PHOTO_CAP), async (req, res) => {
  try {
    const current = await listHomePhotos();
    const incoming = req.files || [];
    if (!incoming.length) return res.status(400).json({ error: "Choose at least one photo." });
    if (current.length + incoming.length > HOME_PHOTO_CAP) {
      return res.status(400).json({
        error: `Home can show ${HOME_PHOTO_CAP} photos. Remove some before adding more.`,
      });
    }
    let sort = current.length ? current[current.length - 1].sort_order + 1 : 0;
    const added = [];
    for (const file of incoming) {
      const uploaded = await scanAndUpload(file, "site/home");
      if (uploaded.error) return res.status(400).json({ error: uploaded.error });
      const { rows } = await db.query(
        `INSERT INTO home_photos (file_url, object_position, sort_order)
         VALUES ($1, $2, $3)
         RETURNING id, file_url, object_position, sort_order`,
        [uploaded.file_url, DEFAULT_POSITION, sort],
      );
      added.push(rows[0]);
      sort += 1;
    }
    res.status(201).json(added);
  } catch (err) {
    console.error("Home photos upload error:", err.message);
    res.status(500).json({ error: "Couldn't add those photos." });
  }
});

router.delete("/home-photos/:id", boardRequired, async (req, res) => {
  try {
    const { rows } = await db.query(`DELETE FROM home_photos WHERE id = $1 RETURNING file_url`, [
      req.params.id,
    ]);
    if (!rows[0]) return res.status(404).json({ error: "That photo is already gone." });
    await deleteFromR2(rows[0].file_url);
    res.json({ ok: true });
  } catch (err) {
    console.error("Home photos delete error:", err.message);
    res.status(500).json({ error: "Couldn't remove that photo." });
  }
});

router.get("/board-cards", authRequired, async (_req, res) => {
  try {
    res.json(await listBoardCards());
  } catch (err) {
    console.error("Board cards list error:", err.message);
    res.status(500).json({ error: "Couldn't load The Board." });
  }
});

router.post("/board-cards", boardRequired, upload.single("photo"), async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const title = String(req.body.title || "Board member").trim() || "Board member";
    const blurb = String(req.body.blurb || "").trim();
    if (!name) return res.status(400).json({ error: "Name is required." });
    if (!blurb) return res.status(400).json({ error: "Add a short blurb." });
    let photo_url = "";
    if (req.file) {
      const uploaded = await scanAndUpload(req.file, "site/board");
      if (uploaded.error) return res.status(400).json({ error: uploaded.error });
      photo_url = uploaded.file_url;
    }
    const { rows: last } = await db.query(`SELECT COALESCE(MAX(sort_order), -1) AS max FROM board_cards`);
    const { rows } = await db.query(
      `INSERT INTO board_cards (name, title, photo_url, blurb, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, title, photo_url, blurb, sort_order`,
      [name, title, photo_url, blurb, Number(last[0]?.max || -1) + 1],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Board card create error:", err.message);
    res.status(500).json({ error: "Couldn't add that board member." });
  }
});

router.patch("/board-cards/:id", boardRequired, upload.single("photo"), async (req, res) => {
  try {
    const { rows: existing } = await db.query(`SELECT * FROM board_cards WHERE id = $1`, [req.params.id]);
    if (!existing[0]) return res.status(404).json({ error: "That card is gone." });
    const current = existing[0];
    const name = req.body.name != null ? String(req.body.name).trim() : current.name;
    const title = req.body.title != null ? String(req.body.title).trim() || "Board member" : current.title;
    const blurb = req.body.blurb != null ? String(req.body.blurb).trim() : current.blurb;
    if (!name) return res.status(400).json({ error: "Name is required." });
    if (!blurb) return res.status(400).json({ error: "Add a short blurb." });
    let photo_url = current.photo_url;
    if (req.file) {
      const uploaded = await scanAndUpload(req.file, "site/board");
      if (uploaded.error) return res.status(400).json({ error: uploaded.error });
      photo_url = uploaded.file_url;
      await deleteFromR2(current.photo_url);
    }
    const { rows } = await db.query(
      `UPDATE board_cards
          SET name = $1, title = $2, photo_url = $3, blurb = $4
        WHERE id = $5
        RETURNING id, name, title, photo_url, blurb, sort_order`,
      [name, title, photo_url, blurb, req.params.id],
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("Board card update error:", err.message);
    res.status(500).json({ error: "Couldn't save that card." });
  }
});

router.delete("/board-cards/:id", boardRequired, async (req, res) => {
  try {
    const { rows } = await db.query(`DELETE FROM board_cards WHERE id = $1 RETURNING photo_url`, [
      req.params.id,
    ]);
    if (!rows[0]) return res.status(404).json({ error: "That card is already gone." });
    await deleteFromR2(rows[0].photo_url);
    res.json({ ok: true });
  } catch (err) {
    console.error("Board card delete error:", err.message);
    res.status(500).json({ error: "Couldn't remove that card." });
  }
});

async function readSetting(key) {
  const { rows } = await db.query("SELECT value FROM community_settings WHERE key = $1", [key]);
  return rows[0]?.value || null;
}

async function writeSetting(key, value, who) {
  await db.query(
    `INSERT INTO community_settings (key, value, updated_at, updated_by)
     VALUES ($1, $2::jsonb, NOW(), $3)
     ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW(), updated_by = $3`,
    [key, JSON.stringify(value), who],
  );
}

function who(req) {
  return [req.user?.email, req.user?.id].filter(Boolean).join(" ") || "board";
}

function landingFrom(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  const kind = value.kind === "video" ? "video" : "image";
  return {
    kind,
    file_url: String(value.file_url || DEFAULT_LANDING.file_url),
    object_position: String(value.object_position || DEFAULT_LANDING.object_position),
  };
}

router.get("/landing-hero", async (_req, res) => {
  try {
    res.json(landingFrom(await readSetting("landing_hero")));
  } catch (err) {
    console.error("Landing hero read error:", err.message);
    res.status(500).json({ error: "Couldn't load the landing cover." });
  }
});

router.post("/landing-hero", boardRequired, landingUpload.single("media"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Choose a photo or video." });
    const isVideo = isAllowedVideoType(file.mimetype);
    const isImage = isAllowedImageType(file.mimetype);
    if (!isVideo && !isImage) {
      return res.status(400).json({ error: "Use a JPEG, PNG, WebP, GIF, MP4, or WebM file." });
    }
    if (isImage) {
      const scan = await checkImageBuffer(file.buffer, file.mimetype, file.originalname);
      if (!scan.safe) return res.status(400).json({ error: scan.reason || "That file didn't pass the safety check." });
    }
    const file_url = await uploadToR2(file.buffer, file.originalname, file.mimetype, "site/landing");
    const current = landingFrom(await readSetting("landing_hero"));
    await deleteFromR2(current.file_url);
    const next = {
      kind: isVideo ? "video" : "image",
      file_url,
      object_position: current.object_position,
    };
    await writeSetting("landing_hero", next, who(req));
    res.json(next);
  } catch (err) {
    console.error("Landing hero upload error:", err.message);
    res.status(500).json({ error: "Couldn't save that cover. If it's a large video, Aaron can help." });
  }
});

router.get("/civic-guide", async (_req, res) => {
  try {
    res.json(mergeCivic(await readSetting("civic_guide")));
  } catch (err) {
    console.error("Civic guide read error:", err.message);
    res.status(500).json({ error: "Couldn't load Who to call." });
  }
});

router.put("/civic-guide", boardRequired, async (req, res) => {
  try {
    const next = serializeCivic(req.body);
    await writeSetting("civic_guide", next, who(req));
    res.json(mergeCivic(next));
  } catch (err) {
    console.error("Civic guide save error:", err.message);
    res.status(500).json({ error: "Couldn't save Who to call." });
  }
});

module.exports = router;
