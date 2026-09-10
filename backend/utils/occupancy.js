function normalizeOccupancy(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (raw === "renter" || raw === "rent") return "renter";
  if (raw === "owner" || raw === "own") return "owner";
  return null;
}

module.exports = { normalizeOccupancy };
