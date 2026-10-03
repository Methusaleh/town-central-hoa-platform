const DEFAULTS = {
  payee: "Town Central HOA",
  routing: "",
  account: "",
  lockbox: ["", "", ""],
  due_label: "June 1, 2026",
};

function asLines(value) {
  if (Array.isArray(value)) return value.map((line) => String(line || "").trim()).slice(0, 3);
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => line.trim())
      .slice(0, 3);
  }
  return ["", "", ""];
}

function padLines(lines) {
  const next = asLines(lines);
  while (next.length < 3) next.push("");
  return next.slice(0, 3);
}

function normalizeDuesPay(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  return {
    payee: String(value.payee != null ? value.payee : DEFAULTS.payee).trim() || DEFAULTS.payee,
    routing: String(value.routing || "").trim(),
    account: String(value.account || "").trim(),
    lockbox: padLines(value.lockbox),
    due_label: String(value.due_label != null ? value.due_label : DEFAULTS.due_label).trim(),
  };
}

module.exports = { DEFAULTS, normalizeDuesPay };
