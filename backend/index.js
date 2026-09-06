const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");
const announcementRoutes = require("./routes/announcementRoutes");
const duesRoutes = require("./routes/duesRoutes");
const requestRoutes = require("./routes/requestRoutes");
const eventRoutes = require("./routes/eventRoutes");
const residentRoutes = require("./routes/residentRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const documentRoutes = require("./routes/documentRoutes");
const alertRoutes = require("./routes/alertRoutes");
const porchRoutes = require("./routes/porchRoutes");
const mediaRoutes = require("./routes/mediaRoutes");

const app = express();
const port = process.env.PORT || 8080;

const allowedOrigins = [
  "http://localhost:5173",
  "https://town-central-hoa-platform.vercel.app",
  "https://town-central-hoa-platform-469564564131.us-central1.run.app",
  "https://towncentralhoa.org",
  "https://www.towncentralhoa.org",
];

app.use(
  cors({
    origin: (origin, cb) =>
      !origin || allowedOrigins.includes(origin)
        ? cb(null, true)
        : cb(new Error("CORS error")),
    credentials: true,
  }),
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/announcements", announcementRoutes);
app.use("/api/dues", duesRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/residents", residentRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/porch", porchRoutes);
app.use("/api/media", mediaRoutes);

async function start() {
  try {
    await db.runMigrations();
  } catch (err) {
    console.error("Migration warning:", err.message);
  }

  app.listen(port, "0.0.0.0", () => console.log(`Server running on port ${port}`));
}

start();
