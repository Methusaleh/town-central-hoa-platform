const { Pool } = require("pg");
const { migrate } = require("./migrate");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Database pool error:", err.message);
});

const query = (text, params) => pool.query(text, params);

async function runMigrations() {
  await migrate(query);
  console.log("Database migrations checked.");
}

module.exports = {
  query,
  pool,
  runMigrations,
};
