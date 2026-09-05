const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,                  // Limits max concurrent connections to keep pool lightweight
  idleTimeoutMillis: 30000, // Closes idle clients after 30 seconds of inactivity
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};