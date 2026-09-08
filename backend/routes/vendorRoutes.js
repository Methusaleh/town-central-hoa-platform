const express = require("express");
const router = express.Router();
const db = require("../db");
const { authRequired, boardRequired } = require("../middleware/auth");

function cleanVendor(body) {
  const company_name = String(body.company_name || "").trim();
  const service_type = String(body.service_type || "").trim();
  const contact_phone = String(body.contact_phone || "").trim() || null;
  const contact_email = String(body.contact_email || "").trim().toLowerCase() || null;
  let website_url = String(body.website_url || "").trim() || null;
  if (website_url && !/^https?:\/\//i.test(website_url)) {
    website_url = `https://${website_url}`;
  }
  const notes = String(body.notes || "").trim() || null;
  return { company_name, service_type, contact_phone, contact_email, website_url, notes };
}

router.get("/", authRequired, async (_req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM verified_vendors ORDER BY service_type ASC, company_name ASC",
    );
    res.json(rows);
  } catch (err) {
    console.error("Vendor list error:", err.message);
    res.status(500).json({ error: "Could not load trusted companies." });
  }
});

router.post("/", boardRequired, async (req, res) => {
  const vendor = cleanVendor(req.body);
  if (!vendor.company_name || !vendor.service_type) {
    return res.status(400).json({ error: "Company name and trade are required." });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO verified_vendors (company_name, service_type, contact_phone, contact_email, website_url, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        vendor.company_name,
        vendor.service_type,
        vendor.contact_phone,
        vendor.contact_email,
        vendor.website_url,
        vendor.notes,
      ],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Vendor create error:", err.message);
    res.status(500).json({ error: "Could not add that company." });
  }
});

router.put("/:id", boardRequired, async (req, res) => {
  const vendor = cleanVendor(req.body);
  if (!vendor.company_name || !vendor.service_type) {
    return res.status(400).json({ error: "Company name and trade are required." });
  }
  try {
    const { rows } = await db.query(
      `UPDATE verified_vendors
       SET company_name = $1, service_type = $2, contact_phone = $3, contact_email = $4, website_url = $5, notes = $6
       WHERE id = $7
       RETURNING *`,
      [
        vendor.company_name,
        vendor.service_type,
        vendor.contact_phone,
        vendor.contact_email,
        vendor.website_url,
        vendor.notes,
        req.params.id,
      ],
    );
    if (!rows[0]) return res.status(404).json({ error: "That company is not on the list." });
    res.json(rows[0]);
  } catch (err) {
    console.error("Vendor update error:", err.message);
    res.status(500).json({ error: "Could not update that company." });
  }
});

router.delete("/:id", boardRequired, async (req, res) => {
  try {
    const { rowCount } = await db.query("DELETE FROM verified_vendors WHERE id = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "That company is not on the list." });
    res.json({ success: true });
  } catch (err) {
    console.error("Vendor delete error:", err.message);
    res.status(500).json({ error: "Could not remove that company." });
  }
});

module.exports = router;
