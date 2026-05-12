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

app.post("/api/users", async (req, res) => {
  const { first_name, last_name, email, address, lot_number } = req.body;

  try {
    const result = await pool.query(
      // Ensure we have 7 columns and 7 values ($1 through $7)
      "INSERT INTO users (first_name, last_name, email, address, lot_number, role, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
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
    console.error("Database Error:", err); // This will show up in Google Cloud Logs
    res.status(500).json({ error: "Failed to add resident" });
  }
});

// Submit a maintenance request
app.post("/api/maintenance", async (req, res) => {
  const { resident_id, title, description, priority } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO maintenance_requests (resident_id, title, description, priority) VALUES ($1, $2, $3, $4) RETURNING *",
      [resident_id, title, description, priority || "normal"],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Maintenance Error:", err);
    res.status(500).json({ error: "Failed to submit request" });
  }
});

// Get all requests (for the Admin view)
app.get("/api/maintenance", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, u.first_name, u.last_name 
      FROM maintenance_requests m 
      JOIN users u ON m.resident_id = u.id 
      ORDER BY m.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
