const db = require("../db");

async function guidelinesRequired(req, res, next) {
  try {
    const { rows } = await db.query("SELECT agreed_to_guidelines FROM users WHERE id = $1", [
      req.user.id,
    ]);
    if (!rows[0]) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (!rows[0].agreed_to_guidelines) {
      return res.status(403).json({ error: "Agree to the community guidelines first." });
    }
    return next();
  } catch (err) {
    console.error("Guidelines check failed:", err.message);
    return res.status(500).json({ error: "Could not verify guidelines agreement." });
  }
}

module.exports = { guidelinesRequired };
