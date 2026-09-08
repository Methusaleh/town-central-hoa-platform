const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const db = require("../db");
const { uploadToR2, deleteFromR2 } = require("./s3Storage");

const KINDS = ["door_drop", "welcome_packet"];

const PRESETS = {
  upper: { left: 0.1, bottom: 0.58, width: 0.8, height: 0.2 },
  center: { left: 0.1, bottom: 0.38, width: 0.8, height: 0.2 },
  lower: { left: 0.1, bottom: 0.1, width: 0.8, height: 0.18 },
};

const FIELD_ALIASES = {
  claim_code: ["claim_code", "claimcode", "code", "token", "onboarding_token"],
  street_address: ["street_address", "street", "address"],
  occupant_name: ["occupant_name", "name", "resident", "household"],
  claim_url: ["claim_url", "url"],
  first_name: ["first_name", "firstname"],
};

const BRAND = rgb(0.239, 0.42, 0.31);
const INK = rgb(0.11, 0.141, 0.125);
const WHITE = rgb(1, 1, 1);

function normalizeKind(kind) {
  const value = String(kind || "").trim();
  return KINDS.includes(value) ? value : "";
}

function occupantName(lot) {
  const name = `${lot?.first_name || ""} ${lot?.last_name || ""}`.trim();
  if (!name || /^pending\s+resident$/i.test(name)) return "";
  return name;
}

function stampBox(stamp = {}, page) {
  const preset = PRESETS[stamp.placement] || PRESETS.lower;
  const left = Number(stamp.left);
  const bottom = Number(stamp.bottom);
  const width = Number(stamp.width);
  const height = Number(stamp.height);
  const box = {
    left: Number.isFinite(left) ? left : preset.left,
    bottom: Number.isFinite(bottom) ? bottom : preset.bottom,
    width: Number.isFinite(width) ? width : preset.width,
    height: Number.isFinite(height) ? height : preset.height,
  };
  const { width: pageW, height: pageH } = page.getSize();
  return {
    x: box.left * pageW,
    y: box.bottom * pageH,
    w: box.width * pageW,
    h: box.height * pageH,
    cover: Boolean(stamp.cover),
  };
}

function fieldMap(form) {
  const map = {};
  try {
    form.getFields().forEach((field) => {
      const name = String(field.getName() || "")
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
      if (name) map[name] = field;
    });
  } catch {
    return map;
  }
  return map;
}

function setField(map, aliases, value) {
  if (!value) return false;
  for (const alias of aliases) {
    const field = map[alias];
    if (!field || typeof field.setText !== "function") continue;
    try {
      field.setText(String(value));
      return true;
    } catch {
      /* try next alias */
    }
  }
  return false;
}

function fillFields(pdfDoc, values) {
  try {
    const form = pdfDoc.getForm();
    const map = fieldMap(form);
    const filled = {};
    Object.entries(FIELD_ALIASES).forEach(([key, aliases]) => {
      filled[key] = setField(map, aliases, values[key]);
    });
    return filled;
  } catch {
    return {};
  }
}

function fitSize(font, text, maxWidth, maxHeight) {
  let size = Math.min(36, maxHeight * 0.55);
  while (size > 9 && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 1;
  }
  return size;
}

function drawCentered(page, font, value, box, size, color, y) {
  const w = font.widthOfTextAtSize(value, size);
  const x = box.x + Math.max(0, (box.w - w) / 2);
  page.drawText(value, { x, y, size, font, color });
}

function stampClaim(page, fonts, lot, stamp) {
  const box = stampBox(stamp, page);
  const code = String(lot.onboarding_token || "").trim().toUpperCase() || "----";
  const street = lot.street_address || "";
  const who = occupantName(lot);
  const pad = 10;
  const innerW = box.w - pad * 2;

  if (box.cover) {
    page.drawRectangle({
      x: box.x,
      y: box.y,
      width: box.w,
      height: box.h,
      color: WHITE,
      borderColor: BRAND,
      borderWidth: 1.5,
    });
  }

  const codeSize = fitSize(fonts.bold, code, innerW, box.h * 0.55);
  const codeY = box.y + box.h * 0.28;
  drawCentered(page, fonts.bold, code, box, codeSize, INK, codeY);

  if (street) {
    const streetSize = fitSize(fonts.regular, street, innerW, box.h * 0.22);
    drawCentered(page, fonts.regular, street, box, streetSize, INK, box.y + box.h * 0.68);
  }
  if (who) {
    const nameSize = Math.min(11, fitSize(fonts.regular, who, innerW, box.h * 0.16));
    drawCentered(page, fonts.regular, who, box, nameSize, INK, box.y + box.h * 0.12);
  }
}

async function fetchBytes(fileUrl) {
  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error("Could not load the uploaded PDF.");
  }
  return Buffer.from(await res.arrayBuffer());
}

async function getTemplate(kind) {
  const key = normalizeKind(kind);
  if (!key) return null;
  const { rows } = await db.query("SELECT * FROM print_templates WHERE kind = $1", [key]);
  return rows[0] || null;
}

async function listTemplates() {
  const { rows } = await db.query(
    "SELECT kind, file_url, file_name, stamp, updated_at FROM print_templates ORDER BY kind",
  );
  return rows;
}

async function saveTemplate({ kind, buffer, originalName, mimeType, user }) {
  const key = normalizeKind(kind);
  if (!key) throw new Error("Unknown template.");
  const existing = await getTemplate(key);
  const fileUrl = await uploadToR2(buffer, originalName || `${key}.pdf`, mimeType || "application/pdf");
  if (existing?.file_url) {
    await deleteFromR2(existing.file_url).catch(() => {});
  }
  const stamp = existing?.stamp || { placement: "lower", cover: false };
  const { rows } = await db.query(
    `INSERT INTO print_templates (kind, file_url, file_name, stamp, updated_by, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, CURRENT_TIMESTAMP)
     ON CONFLICT (kind) DO UPDATE
       SET file_url = EXCLUDED.file_url,
           file_name = EXCLUDED.file_name,
           updated_by = EXCLUDED.updated_by,
           updated_at = CURRENT_TIMESTAMP
     RETURNING kind, file_url, file_name, stamp, updated_at`,
    [key, fileUrl, originalName || `${key}.pdf`, JSON.stringify(stamp), user?.email || null],
  );
  return rows[0];
}

async function updateStamp(kind, stamp, user) {
  const key = normalizeKind(kind);
  const existing = await getTemplate(key);
  if (!existing) throw new Error("Upload a PDF first.");
  const placement = PRESETS[stamp?.placement] ? stamp.placement : existing.stamp?.placement || "lower";
  const next = {
    ...(PRESETS[placement] || PRESETS.lower),
    placement,
    cover: Boolean(stamp?.cover),
  };
  const { rows } = await db.query(
    `UPDATE print_templates
     SET stamp = $2::jsonb, updated_by = $3, updated_at = CURRENT_TIMESTAMP
     WHERE kind = $1
     RETURNING kind, file_url, file_name, stamp, updated_at`,
    [key, JSON.stringify(next), user?.email || null],
  );
  return rows[0];
}

async function removeTemplate(kind) {
  const existing = await getTemplate(kind);
  if (!existing) return null;
  await deleteFromR2(existing.file_url).catch(() => {});
  await db.query("DELETE FROM print_templates WHERE kind = $1", [existing.kind]);
  return existing;
}

async function buildDoorDropPdf(lots) {
  const template = await getTemplate("door_drop");
  if (!template) return null;
  const bytes = await fetchBytes(template.file_url);
  const out = await PDFDocument.create();
  const bold = await out.embedFont(StandardFonts.HelveticaBold);
  const regular = await out.embedFont(StandardFonts.Helvetica);
  const claimUrl = `${process.env.FRONTEND_URL || "https://towncentralhoa.org"}/claim`;

  for (const lot of lots) {
    const copy = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const values = {
      claim_code: String(lot.onboarding_token || "").trim().toUpperCase(),
      street_address: lot.street_address || "",
      occupant_name: occupantName(lot),
      claim_url: claimUrl,
      first_name: lot.first_name || "",
    };
    const filled = fillFields(copy, values);
    try {
      copy.getForm().flatten();
    } catch {
      /* no form */
    }
    const [page] = await out.copyPages(copy, [0]);
    out.addPage(page);
    if (!filled.claim_code) {
      stampClaim(page, { bold, regular }, lot, template.stamp || {});
    }
  }

  return Buffer.from(await out.save());
}

async function buildWelcomeAttachment({ firstName, streetAddress }) {
  const template = await getTemplate("welcome_packet");
  if (!template) return null;
  const bytes = await fetchBytes(template.file_url);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  fillFields(pdf, {
    first_name: firstName || "",
    street_address: streetAddress || "",
    occupant_name: firstName || "",
    claim_url: `${process.env.FRONTEND_URL || "https://towncentralhoa.org"}/login`,
  });
  try {
    pdf.getForm().flatten();
  } catch {
    /* no form */
  }
  return {
    filename: template.file_name || "Town-Central-welcome.pdf",
    content: Buffer.from(await pdf.save()),
    contentType: "application/pdf",
  };
}

module.exports = {
  KINDS,
  PRESETS,
  getTemplate,
  listTemplates,
  saveTemplate,
  updateStamp,
  removeTemplate,
  buildDoorDropPdf,
  buildWelcomeAttachment,
};
