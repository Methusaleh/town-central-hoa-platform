export const REQUEST_TYPES = [
  {
    value: "maintenance",
    label: "Common area or repair",
    hint: "A light is out, irrigation flooding a sidewalk, or something the association maintains.",
  },
  {
    value: "home_change",
    label: "Change to my house",
    hint: "Fence, paint, addition, or anything that changes how the house looks from the street.",
  },
];

const LEGACY = { arc: "home_change" };

export function normalizeRequestType(value) {
  const key = String(value || "").trim();
  return LEGACY[key] || key;
}

export function requestTypeLabel(value) {
  const normalized = normalizeRequestType(value);
  return REQUEST_TYPES.find((item) => item.value === normalized)?.label || "Request";
}

export const TICKET_STATUSES = ["Open", "In review", "Resolved"];

export function ticketStatusLabel(status) {
  return TICKET_STATUSES.includes(status) ? status : "Open";
}
