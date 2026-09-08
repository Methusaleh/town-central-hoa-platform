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
