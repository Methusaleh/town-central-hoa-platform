const jwt = require("jsonwebtoken");
const db = require("../db");

const BOARD_ROLES = ["board_member", "super_admin"];

function isBoard(user) {
  return BOARD_ROLES.includes(user?.role);
}

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || "resident",
      address: user.address || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function publicUser(row) {
  const occupancy = row.occupancy === "renter" || row.occupancy === "owner" ? row.occupancy : null;
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    address: row.address,
    role: row.role || "resident",
    occupancy,
    agreed_to_guidelines: Boolean(row.agreed_to_guidelines),
    social_muted: Boolean(row.social_muted),
    photo: row.profile_photo || null,
  };
}

function authRequired(req, res, next) {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: "Server auth is not configured." });
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

function boardRequired(req, res, next) {
  authRequired(req, res, async () => {
    try {
      const { rows } = await db.query("SELECT role FROM users WHERE id = $1", [req.user.id]);
      req.user.role = rows[0]?.role || "resident";
      if (!isBoard(req.user)) {
        return res.status(403).json({ error: "Board access required." });
      }
      next();
    } catch (err) {
      console.error("Board access check error:", err.message);
      return res.status(500).json({ error: "Couldn't verify board access." });
    }
  });
}

module.exports = {
  BOARD_ROLES,
  isBoard,
  signToken,
  publicUser,
  authRequired,
  boardRequired,
};
