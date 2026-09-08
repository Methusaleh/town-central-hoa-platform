const STORAGE_PREFIX = "tc_board_selection_";

function storageKey(userId, surface) {
  return `${STORAGE_PREFIX}${userId || "anon"}_${surface}`;
}

export function readBoardSelection(userId, surface) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId, surface)) || "null");
  } catch {
    return null;
  }
}

export function writeBoardSelection(userId, surface, value) {
  try {
    localStorage.setItem(storageKey(userId, surface), JSON.stringify(value));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function rosterSelectionPayload({ selectedId, selectedIds, selectedPeople, lots }) {
  const byId = new Map((lots || []).map((lot) => [String(lot.id), lot]));
  return {
    selectedId: selectedId ?? null,
    selectedIds: selectedIds || [],
    selectedStreets: (selectedIds || [])
      .map((id) => byId.get(String(id))?.street_address)
      .filter(Boolean),
    selectedStreet: byId.get(String(selectedId))?.street_address || null,
    selectedPeople: selectedPeople || [],
  };
}

export function restoreRosterSelection(saved, lots) {
  const list = Array.isArray(lots) ? lots : [];
  const byId = new Map(list.map((lot) => [String(lot.id), lot]));
  const byStreet = new Map(list.map((lot) => [String(lot.street_address || "").toLowerCase(), lot]));
  const picked = new Map();

  (saved?.selectedIds || []).forEach((id) => {
    const lot = byId.get(String(id));
    if (lot) picked.set(String(lot.id), lot);
  });
  (saved?.selectedStreets || []).forEach((street) => {
    const lot = byStreet.get(String(street || "").toLowerCase());
    if (lot) picked.set(String(lot.id), lot);
  });

  const open =
    byId.get(String(saved?.selectedId)) ||
    byStreet.get(String(saved?.selectedStreet || "").toLowerCase()) ||
    null;

  return {
    selectedIds: [...picked.values()].map((lot) => lot.id),
    selectedId: open?.id ?? null,
  };
}
