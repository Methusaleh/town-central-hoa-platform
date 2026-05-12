const express = require("express");
const cors = require("cors");
const { Pool } = require("pg"); // Import the Postgres tool
require("dotenv").config();

const app = express();
const port = process.env.PORT || 8080;

// 1. Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon/Cloud connections
  },
});

// 2. CORS Logic (The one that worked!)
const allowedOrigins = [
  "http://localhost:5173",
  "https://town-central-hoa-platform.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());

// 3. Test Route (Keep this to verify the API is alive)
app.get("/", (req, res) => {
  res.send("HOA API is running successfully!");
});

// 4. NEW: Database Test Route (Fetches the user you just added)
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, first_name, last_name, role FROM users",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Failed to fetch users from database" });
  }
});

// Add a new resident
app.post("/api/users", async (req, res) => {
  const { first_name, last_name, email, address, lot_number } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO users (first_name, last_name, email, address, lot_number, role, status) VALUES ($1, $2, $3, $4, $5, $1, $2) RETURNING *",
      [
        first_name,
        last_name,
        email,
        address,
        lot_number,
        "resident",
        "pending",
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add resident" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
