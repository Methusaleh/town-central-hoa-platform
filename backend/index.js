const express = require("express");
const cors = require("cors");
const db = require("./db"); // Import our new connection file
const announcementRoutes = require("./routes/announcementRoutes"); // 1. ADD THIS
const duesRoutes = require("./routes/duesRoutes");
const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://town-central-hoa-platform.vercel.app",
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

app.use(express.json());

// 2. ADD THIS: Plug in the announcements route
app.use("/api/announcements", announcementRoutes);
app.use("/api/dues", duesRoutes);

// We will plug in separate route files here as we build them
// app.use('/api/residents', residentRoutes);
// app.use('/api/board', boardRoutes);

app.listen(8080, () => console.log("Server running on port 8080"));
