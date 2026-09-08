const PAGE_W = 612;
const PAGE_H = 792;
const CLAIM_URL = "https://towncentralhoa.org/claim";
const BOARD_EMAIL = "board@towncentralhoa.org";

function pdfEscape(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\t\n\r\x20-\x7E]/g, "");
}

function text(font, size, x, y, value) {
  return `BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfEscape(value)}) Tj ET\n`;
}

function centered(font, size, y, value, width = PAGE_W) {
  const w = String(value ?? "").length * size * 0.5;
  const x = Math.max(54, (width - w) / 2);
  return text(font, size, x, y, value);
}

function rect(x, y, w, h) {
  return `${x} ${y} ${w} ${h} re S\n`;
}

function occupantLabel(lot) {
  const name = `${lot?.first_name || ""} ${lot?.last_name || ""}`.trim();
  if (!name || /^pending\s+resident$/i.test(name)) return "";
  return name;
}

function pageStream(lot) {
  const street = lot.street_address || "Your street";
  const code = String(lot.onboarding_token || "").trim().toUpperCase() || "————";
  const who = occupantLabel(lot);
  let s = "q\n0.18 0.22 0.21 RG\n1.5 w\n";
  s += rect(36, 36, PAGE_W - 72, PAGE_H - 72);
  s += "0.24 0.42 0.31 RG\n";
  s += rect(54, 470, PAGE_W - 108, 120);
  s += "Q\n";
  s += centered("F2", 11, 720, "TOWN CENTRAL HOA");
  s += centered("F1", 10, 702, "Neighborhood portal");
  s += centered("F2", 18, 658, "This house is ready to claim");
  s += centered("F1", 11, 632, "Leave this flyer on the door or with the household.");
  s += centered("F1", 9, 560, "STREET");
  s += centered("F2", 16, 536, street);
  if (who) s += centered("F1", 11, 512, who);
  s += centered("F1", 9, 488, "CLAIM CODE");
  s += centered("F2", 28, 452, code);
  s += text("F2", 12, 72, 400, "How to get in");
  s += text("F1", 11, 72, 372, `1. Open ${CLAIM_URL}`);
  s += text("F1", 11, 72, 352, "2. Enter this street and the claim code.");
  s += text("F1", 11, 72, 332, "3. Create YOUR own login. Do not share a password.");
  s += text("F1", 11, 72, 312, "4. Invite anyone else who lives here — they get their own login.");
  s += text("F1", 11, 72, 268, "One adult claims the house. Everyone else is invited after that.");
  s += text("F1", 11, 72, 248, `Questions: ${BOARD_EMAIL}`);
  s += centered("F1", 8, 60, "Town Central HOA  ·  Piedmont, Oklahoma");
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
