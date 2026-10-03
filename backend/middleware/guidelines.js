const db = require("../db");

const SOCIAL_MUTE_COPY = "Posting on The Porch and Alerts is paused.";

async function guidelinesRequired(req, res, next) {
  try {
    const { rows } = await db.query(
      "SELECT agreed_to_guidelines, social_muted FROM users WHERE id = $1",
      [req.user.id],
    );
    if (!rows[0]) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (!rows[0].agreed_to_guidelines) {
      return res.status(403).json({ error: "Agree to the community guidelines first." });
    }
    if (rows[0].social_muted) {
      return res.status(403).json({ error: SOCIAL_MUTE_COPY, code: "SOCIAL_MUTED" });
    }
    return next();
  } catch (err) {
    console.error("Guidelines check failed:", err.message);
    return res.status(500).json({ error: "Could not verify guidelines agreement." });
  }
}

module.exports = { guidelinesRequired, SOCIAL_MUTE_COPY };
