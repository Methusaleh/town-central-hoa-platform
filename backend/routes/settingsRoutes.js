const express = require("express");
const router = express.Router();
const db = require("../db");
const { authRequired, boardRequired } = require("../middleware/auth");
const { bannerFor, defaults, normalizeSettings } = require("../utils/trashSchedule");
const { normalizeDuesPay } = require("../utils/duesPay");

async function readTrash() {
  const { rows } = await db.query("SELECT value FROM community_settings WHERE key = $1", ["trash"]);
  return normalizeSettings(rows[0]?.value);
}

router.get("/trash", authRequired, async (_req, res) => {
  try {
    const settings = await readTrash();
    res.json({
      ...settings,
      banner: bannerFor(settings),
    });
  } catch (err) {
    console.error("Trash settings read error:", err.message);
    res.status(500).json({ error: "Couldn't load the trash reminder." });
  }
});

router.put("/trash", boardRequired, async (req, res) => {
  try {
    const current = await readTrash();
    const next = normalizeSettings({
      pickup_weekday: req.body.pickup_weekday ?? current.pickup_weekday,
      override: req.body.override === undefined ? current.override : req.body.override,
    });
    const who = [req.user?.email, req.user?.id].filter(Boolean).join(" ") || "board";
    await db.query(
      `INSERT INTO community_settings (key, value, updated_at, updated_by)
       VALUES ('trash', $1::jsonb, NOW(), $2)
       ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = NOW(), updated_by = $2`,
      [JSON.stringify(next), who],
    );
    res.json({
      ...next,
      banner: bannerFor(next),
    });
  } catch (err) {
    console.error("Trash settings save error:", err.message);
    res.status(500).json({ error: "Couldn't save the trash reminder." });
  }
});

router.get("/trash/defaults", authRequired, (_req, res) => {
  res.json(defaults());
});

async function readDuesPay() {
  const { rows } = await db.query("SELECT value FROM community_settings WHERE key = $1", ["dues_pay"]);
  return normalizeDuesPay(rows[0]?.value);
}

router.get("/dues-pay", authRequired, async (_req, res) => {
  try {
    res.json(await readDuesPay());
  } catch (err) {
    console.error("Dues pay read error:", err.message);
    res.status(500).json({ error: "Couldn't load how neighbors pay." });
  }
});

router.put("/dues-pay", boardRequired, async (req, res) => {
  try {
    const next = normalizeDuesPay(req.body);
    const who = [req.user?.email, req.user?.id].filter(Boolean).join(" ") || "board";
    await db.query(
      `INSERT INTO community_settings (key, value, updated_at, updated_by)
       VALUES ('dues_pay', $1::jsonb, NOW(), $2)
       ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = NOW(), updated_by = $2`,
      [JSON.stringify(next), who],
    );
    res.json(next);
  } catch (err) {
    console.error("Dues pay save error:", err.message);
    res.status(500).json({ error: "Couldn't save how neighbors pay." });
  }
});

module.exports = router;
