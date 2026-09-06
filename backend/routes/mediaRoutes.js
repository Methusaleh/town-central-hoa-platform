const express = require("express");
const axios = require("axios");
const router = express.Router();
const { authRequired } = require("../middleware/auth");

router.get("/gifs", authRequired, async (req, res) => {
  const key = process.env.TENOR_API_KEY;
  if (!key) {
    return res.status(503).json({ error: "GIF search is not configured yet." });
  }

  const query = String(req.query.q || "").trim();
  const endpoint = query
    ? "https://tenor.googleapis.com/v2/search"
    : "https://tenor.googleapis.com/v2/featured";

  try {
    const response = await axios.get(endpoint, {
      params: {
        key,
        q: query || undefined,
        client_key: "towncentralhoa",
        limit: 24,
        contentfilter: "high",
        media_filter: "tinygif,gif",
      },
      timeout: 10000,
    });

    const results = (response.data.results || []).map((item) => ({
      id: item.id,
      title: item.content_description || item.title || "GIF",
      preview: item.media_formats?.tinygif?.url || item.media_formats?.gif?.url,
      url: item.media_formats?.gif?.url || item.media_formats?.tinygif?.url,
    })).filter((item) => item.url);

    res.json({ results });
  } catch (err) {
    console.error("Tenor search error:", err.message);
    res.status(502).json({ error: "GIF search is unavailable right now." });
  }
});

module.exports = router;
