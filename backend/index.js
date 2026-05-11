const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;

const allowedOrigins = [
  "http://localhost:5173", // Your local Vite dev server
  "https://your-vercel-project-name.vercel.app", // Your future live site
  "https://your-custom-domain.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  }),
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("HOA API is running successfully!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
