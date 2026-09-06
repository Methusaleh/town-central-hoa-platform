const axios = require("axios");

const IMAGE_MODELS = "nudity,wad,gore";
const BLOCK_REASON = "This image does not meet Town Central community standards.";

function scannerConfigured() {
  return Boolean(process.env.SIGHTENGINE_API_USER && process.env.SIGHTENGINE_API_SECRET);
}

function isAllowedImageType(mime) {
  return /^image\/(jpeg|jpg|png|gif|webp)$/i.test(String(mime || ""));
}

function isAllowedGifUrl(url) {
  try {
    const parsed = new URL(String(url || ""));
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host === "tenor.com" || host.endsWith(".tenor.com");
  } catch {
    return false;
  }
}

function verdictFromSightengine(data) {
  if (data.status !== "success") {
    return { safe: false, reason: "The safety scanner could not review this image. Try again in a moment." };
  }
  const nudityScore = data.nudity?.safe ?? 1;
  const weaponScore = data.weapon || 0;
  const goreScore = data.gore?.prob || 0;
  if (nudityScore < 0.8 || weaponScore > 0.5 || goreScore > 0.5) {
    return { safe: false, reason: BLOCK_REASON };
  }
  return { safe: true };
}

function failClosed(err, label) {
  console.error(`${label}:`, err.message);
  return {
    safe: false,
    reason: "The safety scanner is unavailable, so this upload was not posted. Try again shortly.",
  };
}

async function checkImageSafety(imageUrl) {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!apiUser || !apiSecret) {
    console.warn("Image scan skipped: SIGHTENGINE_API_USER / SIGHTENGINE_API_SECRET are not set.");
    return { safe: true, skipped: true };
  }
  if (!imageUrl) return { safe: true };

  try {
    const response = await axios.get("https://api.sightengine.com/1.0/check.json", {
      params: {
        url: imageUrl,
        models: IMAGE_MODELS,
        api_user: apiUser,
        api_secret: apiSecret,
      },
      timeout: 12000,
    });
    return verdictFromSightengine(response.data);
  } catch (err) {
    return failClosed(err, "Sightengine URL scan");
  }
}

async function checkImageBuffer(buffer, mimeType = "image/jpeg", filename = "upload.jpg") {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    return { safe: false, reason: "That file could not be read." };
  }
  if (mimeType && !isAllowedImageType(mimeType) && mimeType !== "image/jpg") {
    return { safe: false, reason: "Use a JPEG, PNG, GIF, or WebP image." };
  }
  if (!apiUser || !apiSecret) {
    console.warn("Image scan skipped: SIGHTENGINE keys are not set.");
    return { safe: true, skipped: true };
  }

  try {
    const form = new FormData();
    form.append(
      "media",
      new Blob([Uint8Array.from(buffer)], { type: mimeType || "image/jpeg" }),
      filename,
    );
    form.append("models", IMAGE_MODELS);
    form.append("api_user", apiUser);
    form.append("api_secret", apiSecret);

    const response = await axios.post("https://api.sightengine.com/1.0/check.json", form, {
      timeout: 15000,
    });
    return verdictFromSightengine(response.data);
  } catch (err) {
    return failClosed(err, "Sightengine buffer scan");
  }
}

async function checkImageDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) {
    return { safe: false, reason: "Profile photos must be an image file." };
  }
  const mime = match[1];
  if (!isAllowedImageType(mime)) {
    return { safe: false, reason: "Use a JPEG, PNG, GIF, or WebP image." };
  }
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 2 * 1024 * 1024) {
    return { safe: false, reason: "Profile photos must be under 2MB." };
  }
  return checkImageBuffer(buffer, mime, "avatar.jpg");
}

async function checkTextToxicity(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!text) return { safe: true };
  if (!apiKey) {
    console.warn("Text scan skipped: OPENAI_API_KEY is not set.");
    return { safe: true, skipped: true };
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/moderations",
      { input: text },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 12000,
      },
    );

    const result = response.data.results[0];
    if (result && result.flagged) {
      const flaggedCategories = Object.entries(result.categories)
        .filter(([, isFlagged]) => isFlagged)
        .map(([category]) => category)
        .join(", ");

      return {
        safe: false,
        reason: `Content flagged by community safety standards (${flaggedCategories.replace(/_/g, " ")}).`,
      };
    }

    return { safe: true };
  } catch (err) {
    return failClosed(err, "OpenAI moderation");
  }
}

module.exports = {
  scannerConfigured,
  isAllowedImageType,
  isAllowedGifUrl,
  checkImageSafety,
  checkImageBuffer,
  checkImageDataUrl,
  checkTextToxicity,
};
