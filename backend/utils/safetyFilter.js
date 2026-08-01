const axios = require("axios");

/**
 * Checks image URLs or buffers against Sightengine API for NSFW/explicit content
 */
const checkImageSafety = async (imageUrl) => {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!apiUser || !apiSecret) {
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
    return { safe: true };
  }
};

/**
 * Checks text content against OpenAI Moderation API for toxicity/harassment
 */
const checkTextToxicity = async (text) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !text) return { safe: true };

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/moderations",
      { input: text },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const result = response.data.results[0];
    if (result && result.flagged) {
      // Find which categories were flagged to give a helpful reason
      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, isFlagged]) => isFlagged)
        .map(([category]) => category)
        .join(", ");

      return { 
        safe: false, 
        reason: `Content flagged by community safety standards (${flaggedCategories.replace(/_/g, " ")}).` 
      };
    }

    return { safe: true };
  } catch (err) {
    console.error("OpenAI Moderation API fault:", err.message);
    return { safe: true }; // Fail open if API encounters a temporary glitch
  }
};

module.exports = { checkImageSafety, checkTextToxicity };