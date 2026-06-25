const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");

// Initialize the client to talk to your specific Cloudflare account
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

/**
 * Uploads a file buffer directly to your Cloudflare R2 bucket
 */
const uploadToR2 = async (fileBuffer, originalName, mimeType) => {
  // Generate a random string to ensure we never overwrite files with the same name
  const uniqueId = crypto.randomBytes(8).toString("hex");
  
  // Strip out any weird spaces or characters from the original file name
  const cleanName = originalName.replace(/[^a-zA-Z0-9.]/g, "_");
  const fileName = `${Date.now()}-${uniqueId}-${cleanName}`;

  const params = {
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimeType,
  };

  // Ship it to the bucket
  await s3.send(new PutObjectCommand(params));

  // Return the public URL so you can save it in Postgres
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`;
};

module.exports = { s3, uploadToR2 };