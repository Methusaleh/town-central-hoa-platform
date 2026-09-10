export function isRenter(user) {
  return user?.occupancy === "renter";
}

export function occupancyLabel(value) {
  if (value === "renter") return "Renter";
  if (value === "owner") return "Owner";
  return "Not set";
}
