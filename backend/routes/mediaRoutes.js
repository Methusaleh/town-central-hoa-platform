const express = require("express");
const axios = require("axios");
const router = express.Router();
const { authRequired } = require("../middleware/auth");

const HOUR_MS = 60 * 60 * 1000;
const rateLimitHits = [];

function record429() {
  const now = Date.now();
  rateLimitHits.push(now);
  while (rateLimitHits.length && now - rateLimitHits[0] > HOUR_MS) {
    rateLimitHits.shift();
  }
  console.warn(
    `Giphy 429: beta rate limit hit (${rateLimitHits.length} in the last hour). Stay on the free key unless this becomes routine.`,
  );
}

function shapeGif(item) {
  const images = item.images || {};
  const preview =
    images.fixed_height?.url ||
    images.fixed_width?.url ||
    images.downsized?.url ||
    images.original?.url;
  const url =
    images.downsized?.url ||
    images.original?.url ||
    preview;

  return {
    id: item.id,
    title: item.title || "GIF",
    preview,
    url,
  };
}

router.get("/gifs", authRequired, async (req, res) => {
  const key = process.env.GIPHY_API_KEY;
  if (!key) {
    return res.status(503).json({ error: "GIF search is not configured yet." });
  }

  const query = String(req.query.q || "").trim();
  const endpoint = query
    ? "https://api.giphy.com/v1/gifs/search"
    : "https://api.giphy.com/v1/gifs/trending";

  try {
    const response = await axios.get(endpoint, {
      params: {
        api_key: key,
        q: query || undefined,
        limit: 24,
        rating: "g",
        lang: "en",
      },
      timeout: 10000,
    });

    const results = (response.data.data || [])
      .map(shapeGif)
      .filter((item) => item.url);

    res.json({ results });
  } catch (err) {
    if (err.response?.status === 429) {
      record429();
      return res.status(429).json({
        error: "GIF search is paused for a bit. Try again in a few minutes.",
      });
    }
    console.error("Giphy search error:", err.message);
    res.status(502).json({ error: "GIF search is unavailable right now." });
  }
});

module.exports = router;
