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
        title: "Non-emergency police",
        bullets: ["Noise after hours", "Suspicious activity that is not in progress"],
        detail: "Piedmont Police",
        phone: "",
      },
    ],
  },
  {
    columnId: "city",
    column: "City of Piedmont",
    cards: [
      {
        id: "city_code",
        title: "Code enforcement",
        bullets: ["Tall grass on a private lot the city covers", "Illegal parking on a public street"],
        detail: "City Hall",
        phone: "",
      },
      {
        id: "city_works",
        title: "Utilities & public works",
        bullets: ["Water main / meter issues", "City trash pickup", "Street lights on a public street"],
        detail: "Public Works",
        phone: "",
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

function mergeCivic(saved) {
  const byId = cardMap(saved);
  return TEMPLATE.map((column) => ({
    columnId: column.columnId,
    column: column.column,
    cards: column.cards.map((card) => {
      const incoming = byId[card.id] && typeof byId[card.id] === "object" ? byId[card.id] : {};
      return {
        ...card,
        detail: incoming.detail != null ? String(incoming.detail) : card.detail,
        phone: incoming.phone != null ? String(incoming.phone) : card.phone,
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
