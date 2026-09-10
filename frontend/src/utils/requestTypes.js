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

const LABELS = {
  ...Object.fromEntries(REQUEST_TYPES.map((item) => [item.value, item.label])),
  board_note: "Board note",
  arc: "Change to my house",
};

const LEGACY = { arc: "home_change" };

export function normalizeRequestType(value) {
  const key = String(value || "").trim();
  return LEGACY[key] || key;
}

export function requestTypeLabel(value) {
  const normalized = normalizeRequestType(value);
  return LABELS[normalized] || "Request";
}

export function isBoardNote(request) {
  return request?.source === "board" || request?.request_type === "board_note";
}

export const TICKET_STATUSES = ["Open", "In review", "Resolved"];

export function ticketStatusLabel(status) {
  return TICKET_STATUSES.includes(status) ? status : "Open";
}

export function isArchivedTicket(request, now = new Date()) {
  if (String(request?.status || "") !== "Resolved" || !request?.resolved_at) return false;
  const resolved = new Date(request.resolved_at);
  if (Number.isNaN(resolved.getTime())) return false;
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - 2);
  return resolved < cutoff;
}
