const axios = require("axios");

/**
 * Checks image URLs or buffers against Sightengine API for NSFW/explicit content
 */
const checkImageSafety = async (imageUrl) => {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!apiUser || !apiSecret) {
    // Graceful fallback if keys aren't provided yet
    return { safe: true };
  }

  try {
    const response = await axios.get("https://api.sightengine.com/1.0/check.json", {
      params: {
        url: imageUrl,
        models: "nudity,wad,gore",
        api_user: apiUser,
        api_secret: apiSecret,
      },
    });

    const data = response.data;
    if (data.status === "success") {
      const nudityScore = data.nudity?.safe || 1.0;
      const weaponScore = data.weapon || 0;
      const goreScore = data.gore?.prob || 0;

      if (nudityScore < 0.8 || weaponScore > 0.5 || goreScore > 0.5) {
        return { safe: false, reason: "Image violates community decency or safety standards." };
      }
    }
    return { safe: true };
  } catch (err) {
    console.error("Sightengine API fault:", err.message);
    return { safe: true }; // Fail open or closed depending on preference
  }
};

/**
 * Checks text content against Google Perspective API for toxicity/profanity
 */
const checkTextToxicity = async (text) => {
  const apiKey = process.env.PERSPECTIVE_API_KEY;
  if (!apiKey || !text) return { safe: true };

  try {
    const response = await axios.post(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`,
      {
        comment: { text },
        languages: ["en"],
        requestedAttributes: { TOXICITY: {}, PROFANITY: {} },
      }
    );

    const scores = response.data.attributeScores;
    const toxicityScore = scores.TOXICITY?.summaryScore?.value || 0;
    const profanityScore = scores.PROFANITY?.summaryScore?.value || 0;

    // Threshold set at 0.75 (75% confidence)
    if (toxicityScore > 0.75 || profanityScore > 0.75) {
      return { safe: false, reason: "Content flagged for excessive toxicity or profanity." };
    }

    return { safe: true };
  } catch (err) {
    console.error("Perspective API fault:", err.message);
    return { safe: true };
  }
};

module.exports = { checkImageSafety, checkTextToxicity };