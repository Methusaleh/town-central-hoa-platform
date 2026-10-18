export function websiteHref(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export function websiteLabel(value) {
  try {
    return new URL(websiteHref(value)).hostname.replace(/^www\./, "");
  } catch {
    return "Website";
  }
}

export function telHref(phone) {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

export function formatPhone(phone) {
  const raw = String(phone || "").trim();
  const digits = raw.replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length === 10) {
    return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }
  return raw;
}
