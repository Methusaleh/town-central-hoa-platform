const express = require("express");
const cors = require("cors");
const db = require("./db"); // Import our new connection file
const app = express();

// Use your proven CORS logic [cite: 5]
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

// We will plug in separate route files here as we build them
// app.use('/api/residents', residentRoutes);
// app.use('/api/board', boardRoutes);

app.listen(8080, () => console.log("Server running on port 8080"));
