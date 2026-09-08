const PAGE_W = 612;
const PAGE_H = 792;
const CLAIM_HOST = "towncentralhoa.org/claim";
const CLAIM_URL = `https://${CLAIM_HOST}`;
const BOARD_EMAIL = "board@towncentralhoa.org";

const C = {
  brand: "0.239 0.420 0.310",
  brandDark: "0.192 0.337 0.263",
  paper: "0.910 0.925 0.914",
  ink: "0.110 0.141 0.125",
  muted: "0.416 0.455 0.431",
  white: "1 1 1",
  gold: "0.553 0.431 0.267",
  goldSoft: "0.953 0.918 0.863",
};

function pdfEscape(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\t\n\r\x20-\x7E]/g, "");
}

function fillRect(x, y, w, h, rgb) {
  return `${rgb} rg\n${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`;
}

function textAt(font, size, x, y, value, rgb = C.ink) {
  return `${rgb} rg\nBT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfEscape(value)}) Tj ET\n`;
}

function centerX(value, size, factor = 0.52) {
  const w = String(value ?? "").length * size * factor;
  return Math.max(36, (PAGE_W - w) / 2);
}

function centered(font, size, y, value, rgb, factor = 0.52) {
  return textAt(font, size, centerX(value, size, factor), y, value, rgb);
}

function occupantLabel(lot) {
  const name = `${lot?.first_name || ""} ${lot?.last_name || ""}`.trim();
  if (!name || /^pending\s+resident$/i.test(name)) return "";
  return name;
}

function streetFontSize(street) {
  const len = String(street || "").length;
  if (len > 34) return 14;
  if (len > 24) return 18;
  return 22;
}

function spacedCode(code, y, size = 34) {
  const chars = String(code || "").split("");
  if (!chars.length) return "";
  const gap = size * 0.78;
  const total = chars.length * gap - (gap - size * 0.55);
  let x = (PAGE_W - total) / 2;
  let s = "";
  chars.forEach((ch) => {
    s += textAt("F2", size, x, y, ch, C.white);
    x += gap;
  });
  return s;
}

function stepRow(n, label, y) {
  let s = fillRect(54, y - 4, 22, 22, C.brand);
  s += textAt("F2", 11, n === 1 ? 61.5 : 60.5, y + 2, String(n), C.white);
  s += textAt("F1", 11, 88, y + 2, label, C.ink);
  return s;
}

function pageStream(lot) {
  const street = lot.street_address || "Your street";
  const code = String(lot.onboarding_token || "").trim().toUpperCase() || "————";
  const who = occupantLabel(lot);
  const streetSize = streetFontSize(street);

  let s = "";
  s += fillRect(0, 0, PAGE_W, PAGE_H, C.paper);
  s += fillRect(0, 658, PAGE_W, 134, C.brand);
  s += fillRect(0, 654, PAGE_W, 4, C.gold);
  s += centered("F2", 11, 760, "TOWN CENTRAL HOA", C.white, 0.58);
  s += centered("F1", 10, 742, "Piedmont neighborhood site", C.goldSoft, 0.5);
  s += centered("F2", 22, 708, "This house is invited in", C.white, 0.5);
  s += centered("F1", 11, 682, "Tape this on the door. It is only for this address.", C.goldSoft, 0.48);

  s += fillRect(48, 518, 516, 112, C.white);
  s += fillRect(48, 518, 8, 112, C.brand);
  s += centered("F1", 8, 604, "STREET", C.muted, 0.62);
  s += centered("F2", streetSize, 572, street, C.ink, 0.5);
  if (who) {
    s += centered("F1", 12, 542, who, C.muted, 0.5);
  } else {
    s += centered("F1", 11, 542, "Your household", C.muted, 0.5);
  }

  s += fillRect(48, 352, 516, 148, C.brand);
  s += fillRect(48, 494, 516, 6, C.gold);
  s += centered("F1", 9, 470, "YOUR CLAIM CODE", C.goldSoft, 0.62);
  s += spacedCode(code, 418, 34);
  s += centered("F1", 11, 378, CLAIM_HOST, C.goldSoft, 0.5);

  s += textAt("F2", 13, 54, 312, "How to get in", C.ink);
  s += stepRow(1, `Open ${CLAIM_URL}`, 278);
  s += stepRow(2, "Enter this street and the claim code.", 250);
  s += stepRow(3, "Create your own login. Do not share a password.", 222);
  s += stepRow(4, "Invite anyone else who lives here. They get their own login.", 194);

  s += textAt("F1", 10, 54, 150, "One adult claims the house. Everyone else is invited after that.", C.muted);
  s += textAt("F1", 10, 54, 132, `Questions: ${BOARD_EMAIL}`, C.muted);

  s += fillRect(0, 0, PAGE_W, 48, C.brandDark);
  s += centered("F1", 9, 20, "Town Central HOA  ·  Piedmont, Oklahoma", C.goldSoft, 0.5);
  return s;
}

function buildPdf(lots) {
  const pageCount = lots.length;
  const objects = [];
  const kids = [];
  const contents = lots.map((lot) => pageStream(lot));

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  let nextId = 5;
  contents.forEach((stream) => {
    const contentId = nextId++;
    const pageId = nextId++;
    kids.push(`${pageId} 0 R`);
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
  });

  objects[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pageCount} >>`;

  let body = "%PDF-1.4\n";
  const offsets = [0];
  const maxId = nextId - 1;
  for (let i = 1; i <= maxId; i += 1) {
    offsets[i] = body.length;
    body += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefAt = body.length;
  let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= maxId; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += xref;
  body += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return body;
}

export function buildDoorDropPdf(lots) {
  return buildPdf(lots);
}

export function downloadDoorDropPdf(lots) {
  const flyers = (lots || []).filter((lot) => !lot.is_claimed && lot.onboarding_token);
  if (!flyers.length) {
    throw new Error("Select unclaimed lots that have a claim code.");
  }
  const pdf = buildPdf(flyers);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    flyers.length === 1
      ? `town-central-door-drop-${String(flyers[0].street_address || "lot").replace(/\s+/g, "-").toLowerCase()}.pdf`
      : `town-central-door-drop-${flyers.length}-lots.pdf`;
  link.click();
  URL.revokeObjectURL(url);
  return flyers.length;
}
