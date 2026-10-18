const TEMPLATE = [
  {
    columnId: "emergency",
    column: "Emergency",
    cards: [
      {
        id: "emergency_911",
        title: "Life, fire, crime in progress",
        bullets: ["Medical emergency", "Fire", "Break-in or violence"],
        detail: "Call 911",
        phone: "911",
      },
      {
        id: "emergency_police",
        title: "Piedmont Police Department",
        bullets: ["Noise after hours", "Suspicious activity that is not in progress"],
        detail: "Non-emergency",
        phone: "405-373-1334",
      },
      {
        id: "emergency_fire",
        title: "Piedmont Fire Department",
        bullets: ["Non-emergency fire questions"],
        detail: "Non-emergency",
        phone: "405-373-1331",
      },
    ],
  },
  {
    columnId: "city",
    column: "City of Piedmont",
    cards: [
      {
        id: "city_code",
        title: "City Code Enforcement",
        bullets: ["Tall grass on a private lot the city covers", "Illegal parking on a public street"],
        detail: "City Hall",
        phone: "",
      },
      {
        id: "city_works",
        title: "Utilities & public works",
        bullets: ["Water main / meter issues", "City trash pickup", "Trash can replacement", "Street lights on a public street"],
        detail: "Public Works",
        phone: "",
      },
      {
        id: "city_water_afterhours",
        title: "After-hours water emergency",
        bullets: ["Water main break or after-hours water emergency"],
        detail: "Public Works",
        phone: "405-777-9009",
      },
      {
        id: "city_web",
        title: "City of Piedmont website",
        bullets: ["Permits and other city services"],
        detail: "All other city needs",
        phone: "",
        url: "https://piedmont-ok.gov",
      },
    ],
  },
  {
    columnId: "hoa",
    column: "Town Central HOA",
    cards: [
      {
        id: "hoa_change",
        title: "Change to a house",
        bullets: ["Fence, paint, addition", "Anything that changes the view from the street"],
        detail: "Submit a request",
        phone: "",
      },
      {
        id: "hoa_common",
        title: "Common areas & dues",
        bullets: ["Common-area repair", "Dues questions", "Covenant questions"],
        detail: "Board",
        phone: "",
      },
    ],
  },
];

function cardMap(saved) {
  const raw = saved && typeof saved === "object" ? saved.cards || saved : {};
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

function filled(value, fallback) {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function mergeCivic(saved) {
  const byId = cardMap(saved);
  return TEMPLATE.map((column) => ({
    columnId: column.columnId,
    column: column.column,
    cards: column.cards.map((card) => {
      const incoming = byId[card.id] && typeof byId[card.id] === "object" ? byId[card.id] : {};
      return {
        ...card,
        detail: filled(incoming.detail, card.detail),
        phone: filled(incoming.phone, card.phone),
        url: card.url || "",
      };
    }),
  }));
}

function serializeCivic(body) {
  const byId = cardMap(body);
  const cards = {};
  TEMPLATE.forEach((column) => {
    column.cards.forEach((card) => {
      const incoming = byId[card.id] && typeof byId[card.id] === "object" ? byId[card.id] : {};
      cards[card.id] = {
        detail: incoming.detail != null ? String(incoming.detail).trim() : card.detail,
        phone: incoming.phone != null ? String(incoming.phone).trim() : card.phone,
      };
    });
  });
  return { cards };
}

module.exports = { TEMPLATE, mergeCivic, serializeCivic };
