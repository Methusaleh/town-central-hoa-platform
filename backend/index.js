const express = require("express");
const cors = require("cors");
const db = require("./db"); // Import our new connection file
const announcementRoutes = require("./routes/announcementRoutes"); // 1. ADD THIS
const duesRoutes = require("./routes/duesRoutes");
const requestRoutes = require("./routes/requestRoutes");
const eventRoutes = require("./routes/eventRoutes");
const residentRoutes = require("./routes/residentRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const documentRoutes = require("./routes/documentRoutes");
const alertRoutes = require("./routes/alertRoutes");
const billingRoutes = require("./routes/billingRoutes");
const app = express();
const port = process.env.PORT || 8080; // Use Cloud Run's assigned port or default to 8080


const allowedOrigins = [
  "http://localhost:5173",
  "https://town-central-hoa-platform.vercel.app",
  "https://town-central-hoa-platform-469564564131.us-central1.run.app",
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

// Allows our base64 image streams to pass through smoothly up to 2MB
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

// 2. ADD THIS: Plug in the announcements route
app.use("/api/announcements", announcementRoutes);
app.use("/api/dues", duesRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/residents", residentRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/billing", billingRoutes);

// We will plug in separate route files here as we build them
// app.use('/api/residents', residentRoutes);
// app.use('/api/board', boardRoutes);

// File: ./backend/index.js
app.listen(port, "0.0.0.0", () => console.log(`Server running on port ${port}`));
