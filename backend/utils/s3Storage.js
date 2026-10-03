const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

function keyFromR2Url(fileUrl) {
  const base = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  if (!fileUrl || !base || !String(fileUrl).startsWith(base)) return "";
  const rest = String(fileUrl).slice(base.length).replace(/^\//, "").split("?")[0];
  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}

function folderPrefix(folder) {
  return String(folder || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

const uploadToR2 = async (fileBuffer, originalName, mimeType, folder = "") => {
  const uniqueId = crypto.randomBytes(8).toString("hex");
  const cleanName = String(originalName || "upload").replace(/[^a-zA-Z0-9.]/g, "_");
  const prefix = folderPrefix(folder);
  const fileName = `${prefix ? `${prefix}/` : ""}${Date.now()}-${uniqueId}-${cleanName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType,
    }),
  );

  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`;
};

const deleteFromR2 = async (fileUrl) => {
  const key = keyFromR2Url(fileUrl);
  if (!key) return;
  await s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
    }),
  );
};

module.exports = { s3, uploadToR2, deleteFromR2, keyFromR2Url };
