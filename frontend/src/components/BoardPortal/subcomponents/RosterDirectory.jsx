import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Copy, Download, FileText, FileUp, Info, Mail, Search } from "lucide-react";
import Button from "../../ui/Button";
import { apiFetch } from "../../../api";
import { usePortal } from "../../../layout/PortalContext";
import {
  readBoardSelection,
  restoreRosterSelection,
  rosterSelectionPayload,
  writeBoardSelection,
} from "../../../utils/boardSelection";
import { downloadDoorDropPdf } from "../../../utils/doorDropPdf";
import styles from "./RosterDirectory.module.css";

const EMPTY_FORM = {
  street_address: "",
  first_name: "",
  last_name: "",
  email: "",
};

const EMPTY_TRANSFER = {
  first_name: "",
  last_name: "",
  email: "",
  send_welcome: true,
};

function householdOf(lot) {
  return Array.isArray(lot?.household) ? lot.household : [];
}

function displayName(person) {
  return `${person?.first_name || ""} ${person?.last_name || ""}`.trim() || "Household";
}

function livePeople(savedPeople, list) {
  if (!Array.isArray(savedPeople) || !savedPeople.length) return [];
  const byId = new Map();
  list.forEach((lot) => {
    householdOf(lot).forEach((person) => {
      byId.set(String(person.id), { person, street: lot.street_address });
    });
  });
  return savedPeople
    .map((item) => {
      const hit = byId.get(String(item.id));
      if (!hit) return null;
      return {
        id: hit.person.id,
        email: hit.person.email,
        name: displayName(hit.person),
        street: hit.street,
        welcome_letter_sent_at: hit.person.welcome_letter_sent_at,
      };
    })
    .filter(Boolean);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function lotHasEmail(lot) {
  if (lot?.email) return true;
  return householdOf(lot).some((person) => person.email);
}

function formatSent(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function parseCsv(text) {
  const raw = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    const next = raw[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((value) => String(value).trim()));
}

function headerIndex(header, names) {
  return header.findIndex((value) => names.includes(value));
}

function lotsFromCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length) return { error: "That file is empty.", lots: [] };
  const header = rows[0].map((value) => String(value).trim().toLowerCase().replace(/\s+/g, "_"));
  const streetI = headerIndex(header, ["street_address", "address", "street", "property"]);
  if (streetI < 0) return { error: "Need a street_address column.", lots: [] };
  const firstI = headerIndex(header, ["first_name", "first", "firstname"]);
  const lastI = headerIndex(header, ["last_name", "last", "lastname"]);
  const emailI = headerIndex(header, ["email", "email_address"]);
  const seen = new Set();
  const lots = [];
  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i];
    const street_address = String(cells[streetI] || "").trim();
    if (!street_address) continue;
    const key = street_address.toLowerCase();
    const email = emailI >= 0 ? String(cells[emailI] || "").trim() : "";
    lots.push({
      street_address,
      first_name: firstI >= 0 ? String(cells[firstI] || "").trim() : "",
      last_name: lastI >= 0 ? String(cells[lastI] || "").trim() : "",
      email,
      duplicateInFile: seen.has(key),
    });
    seen.add(key);
  }
  if (!lots.length) return { error: "No street addresses in that file.", lots: [] };
  return { error: "", lots };
}

function downloadImportTemplate() {
  const csv = [
    "street_address,first_name,last_name,email",
    "1600 New Phase Lane,Jordan,Hale,jordan.hale@example.com",
    "1612 New Phase Lane,,,",
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "town-central-lot-import.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function downloadClaimPacket(lots) {
  const header = [
    "street_address",
    "first_name",
    "last_name",
    "email",
    "claim_code",
    "status",
    "household_emails",
  ];
  const rows = lots.map((lot) => [
    lot.street_address,
    lot.first_name,
    lot.last_name,
    lot.email || "",
    lot.onboarding_token || "",
    lot.is_claimed ? "claimed" : "unclaimed",
    householdOf(lot)
      .map((person) => person.email)
      .filter(Boolean)
      .join("; "),
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "town-central-household-packet.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function RosterDirectory({ onBack }) {
  const { user } = usePortal();
  const savedSelection = readBoardSelection(user?.id, "roster") || {};
  const [lots, setLots] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => savedSelection.selectedIds || []);
  const [selectedId, setSelectedId] = useState(() => savedSelection.selectedId ?? null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [transfer, setTransfer] = useState(EMPTY_TRANSFER);
  const [showTransfer, setShowTransfer] = useState(false);
  const [compose, setCompose] = useState("");
  const [composeAudience, setComposeAudience] = useState("households");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");
  const [mobileDetail, setMobileDetail] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState(() => savedSelection.selectedPeople || []);
  const [welcomeConfirm, setWelcomeConfirm] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importLots, setImportLots] = useState([]);
  const [importError, setImportError] = useState("");
  const [importSending, setImportSending] = useState(false);
  const [sendClaimOnImport, setSendClaimOnImport] = useState(false);
  const importInputRef = useRef(null);
  const [showPrint, setShowPrint] = useState(false);
  const [printFiles, setPrintFiles] = useState({ door_drop: null, welcome_packet: null });
  const [printBusy, setPrintBusy] = useState("");
  const doorDropFileRef = useRef(null);
  const welcomeFileRef = useRef(null);

  const selected = lots.find((lot) => String(lot.id) === String(selectedId)) || null;
  const selectionRef = useRef({ selectedId, selectedIds, selectedPeople, lots });
  selectionRef.current = { selectedId, selectedIds, selectedPeople, lots };

  const persistNow = (patch = {}) => {
    const next = { ...selectionRef.current, ...patch };
    selectionRef.current = next;
    writeBoardSelection(user?.id, "roster", rosterSelectionPayload(next));
  };

  const loadLots = async () => {
    try {
      const res = await apiFetch("/api/residents/master-list-placeholder");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLots([]);
        setStatus({
          type: "err",
          text: data.error || (res.status === 403 ? "Board access is required to view the roster." : "Could not load the roster."),
        });
        return;
      }
      const list = Array.isArray(data) ? data : [];
      const saved = readBoardSelection(user?.id, "roster") || {};
      setLots(list);
      setSelectedIds((current) => restoreRosterSelection({
        selectedIds: current,
        selectedStreets: saved.selectedStreets,
      }, list).selectedIds);
      setSelectedId((current) => restoreRosterSelection({
        selectedId: current,
        selectedStreet: saved.selectedStreet,
      }, list).selectedId);
      setSelectedPeople((current) => livePeople(current.length ? current : saved.selectedPeople, list));
    } catch (err) {
      console.error("Roster fetch error:", err);
      setLots([]);
      setStatus({ type: "err", text: "Network error loading the roster." });
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    loadLots();
    loadPrintFiles();
  }, []);

  useEffect(() => {
    writeBoardSelection(
      user?.id,
      "roster",
      rosterSelectionPayload({ selectedId, selectedIds, selectedPeople, lots }),
    );
  }, [user?.id, selectedId, selectedIds, selectedPeople, lots]);

  const loadPrintFiles = async () => {
    try {
      const res = await apiFetch("/api/residents/print-templates");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const next = { door_drop: null, welcome_packet: null };
      (data.templates || []).forEach((item) => {
        next[item.kind] = item;
      });
      setPrintFiles(next);
    } catch (err) {
      console.error("Print templates fetch error:", err);
    }
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return lots;
    return lots.filter((lot) => {
      const members = householdOf(lot)
        .map((person) => `${person.first_name} ${person.last_name} ${person.email}`)
        .join(" ");
      return `${lot.first_name} ${lot.last_name} ${lot.street_address} ${lot.email || ""} ${members}`
        .toLowerCase()
        .includes(needle);
    });
  }, [lots, query]);

  const toggleOne = (id) => {
    setSelectedIds((current) => {
      const selectedIds = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      persistNow({ selectedIds });
      return selectedIds;
    });
    setMobileDetail(true);
  };

  const togglePerson = (person, street) => {
    setSelectedPeople((current) => {
      const selectedPeople = current.some((item) => item.id === person.id)
        ? current.filter((item) => item.id !== person.id)
        : [...current, {
          id: person.id,
          email: person.email,
          name: displayName(person),
          street,
          welcome_letter_sent_at: person.welcome_letter_sent_at,
        }];
      persistNow({ selectedPeople });
      return selectedPeople;
    });
    setMobileDetail(true);
  };

  const selectByStatus = (statusType) => {
    if (statusType === "all") {
      const selectedIds = lots.map((lot) => lot.id);
      setSelectedIds(selectedIds);
      persistNow({ selectedIds });
    } else if (statusType === "claimed") {
      const selectedIds = lots.filter((lot) => lot.is_claimed).map((lot) => lot.id);
      setSelectedIds(selectedIds);
      persistNow({ selectedIds });
    } else if (statusType === "unclaimed") {
      const selectedIds = lots.filter((lot) => !lot.is_claimed).map((lot) => lot.id);
      setSelectedIds(selectedIds);
      persistNow({ selectedIds });
    } else {
      setSelectedIds([]);
      setSelectedPeople([]);
      persistNow({ selectedIds: [], selectedPeople: [] });
    }
    setCompose("");
    setEmailStatus("");
    setWelcomeConfirm(null);
    setMobileDetail(statusType !== "clear");
  };

  const openLot = (lot) => {
    if (selectedIds.length > 0 || selectedPeople.length > 0) return;
    setSelectedId(lot.id);
    persistNow({ selectedId: lot.id });
    setMobileDetail(true);
    setShowTransfer(false);
    setInviteEmail("");
  };

  const handleCopy = async (value, key) => {
    const ok = await copyText(value);
    if (ok) {
      setCopied(key);
      setTimeout(() => setCopied(""), 1600);
    }
  };

  const printDoorDrops = async (targetLots) => {
    const flyers = (targetLots || []).filter((lot) => !lot.is_claimed && lot.onboarding_token);
    if (!flyers.length) {
      setStatus({ type: "err", text: "Select unclaimed lots that have a claim code." });
      return;
    }
    try {
      if (printFiles.door_drop) {
        const res = await apiFetch("/api/residents/lots/door-drop-pdf", {
          method: "POST",
          body: JSON.stringify({ ids: flyers.map((lot) => lot.id) }),
        });
        if (res.status !== 204) {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setStatus({ type: "err", text: data.error || "Could not build those flyers." });
            return;
          }
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download =
            flyers.length === 1
              ? `town-central-door-drop-${String(flyers[0].street_address || "lot").replace(/\s+/g, "-").toLowerCase()}.pdf`
              : `town-central-door-drop-${flyers.length}-lots.pdf`;
          link.click();
          URL.revokeObjectURL(url);
          setStatus({
            type: "ok",
            text: `Downloaded ${flyers.length} flyer${flyers.length === 1 ? "" : "s"} using the board template (one page per house).`,
          });
          return;
        }
      }
      const count = downloadDoorDropPdf(flyers);
      setStatus({
        type: "ok",
        text: `Downloaded ${count} door-drop flyer${count === 1 ? "" : "s"} (one page per house). Print at home or take the PDF to a shop.`,
      });
    } catch (err) {
      setStatus({ type: "err", text: err.message || "Could not build that PDF." });
    }
  };

  const uploadPrintFile = async (kind, file) => {
    if (!file || printBusy) return;
    setPrintBusy(kind);
    setStatus({ type: "", text: "" });
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await apiFetch(`/api/residents/print-templates/${kind}`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ type: "err", text: data.error || "Could not upload that PDF." });
        return;
      }
      setPrintFiles((current) => ({ ...current, [kind]: data }));
      setStatus({
        type: "ok",
        text: kind === "door_drop"
          ? "Door-drop template saved. Door-drop PDF will stamp each claim code onto it."
          : "Welcome packet saved. Welcome letter emails will attach it.",
      });
    } catch {
      setStatus({ type: "err", text: "Network error uploading that PDF." });
    } finally {
      setPrintBusy("");
    }
  };

  const saveDoorDropStamp = async (patch) => {
    const current = printFiles.door_drop?.stamp || { placement: "lower", cover: false };
    const stamp = { ...current, ...patch };
    try {
      const res = await apiFetch("/api/residents/print-templates/door_drop", {
        method: "PATCH",
        body: JSON.stringify({ stamp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ type: "err", text: data.error || "Could not save stamp position." });
        return;
      }
      setPrintFiles((files) => ({ ...files, door_drop: data }));
    } catch {
      setStatus({ type: "err", text: "Network error saving stamp position." });
    }
  };

  const removePrintFile = async (kind) => {
    if (printBusy) return;
    setPrintBusy(`remove-${kind}`);
    try {
      const res = await apiFetch(`/api/residents/print-templates/${kind}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus({ type: "err", text: data.error || "Could not remove that PDF." });
        return;
      }
      setPrintFiles((current) => ({ ...current, [kind]: null }));
      setStatus({
        type: "ok",
        text: kind === "door_drop"
          ? "Door-drop is back to the built-in flyer."
          : "Welcome emails will send without a packet attached.",
      });
    } catch {
      setStatus({ type: "err", text: "Network error removing that PDF." });
    } finally {
      setPrintBusy("");
    }
  };

  const saveLot = async (sendWelcome) => {
    if (!form.street_address.trim() || saving) return;
    setSaving(true);
    setStatus({ type: "", text: "" });
    try {
      const res = await apiFetch("/api/residents", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          send_welcome: sendWelcome,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCreated(data.resident);
        setStatus({
          type: "ok",
          text: sendWelcome && data.resident?.email
            ? "Lot saved and claim letter sent. Each household member keeps their own login."
            : "Lot saved. Copy the claim code or email the letter when you have an address.",
        });
        setForm(EMPTY_FORM);
        await loadLots();
        setSelectedId(data.resident?.id || null);
        setMobileDetail(true);
      } else if (res.status === 409) {
        setStatus({ type: "err", text: data.error || "That street is already listed." });
        if (data.lot?.id) {
          setSelectedId(data.lot.id);
          setMobileDetail(true);
          setShowForm(false);
        }
        await loadLots();
      } else {
        setStatus({ type: "err", text: data.error || "Could not save that lot." });
      }
    } catch {
      setStatus({ type: "err", text: "Network error saving the lot." });
    } finally {
      setSaving(false);
    }
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    const parsed = lotsFromCsv(text);
    setImportError(parsed.error);
    setImportLots(parsed.lots);
  };

  const runImport = async () => {
    const payload = importLots.filter((lot) => !lot.duplicateInFile);
    if (!payload.length || importSending) return;
    setImportSending(true);
    setStatus({ type: "", text: "" });
    try {
      const res = await apiFetch("/api/residents/lots/bulk-import", {
        method: "POST",
        body: JSON.stringify({
          send_claim: sendClaimOnImport,
          lots: payload.map((lot) => ({
            street_address: lot.street_address,
            first_name: lot.first_name,
            last_name: lot.last_name,
            email: lot.email,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ type: "err", text: data.error || "Could not import that file." });
        return;
      }
      const skipped = (data.skipped || []).length;
      const failed = (data.failed || []).length;
      const bits = [data.message || `Added ${data.created || 0} lots.`];
      if (skipped) bits.push(`${skipped} already on the roster.`);
      if (failed) bits.push(`${failed} could not be imported.`);
      setStatus({ type: failed ? "err" : "ok", text: bits.join(" ") });
      setShowImport(false);
      setImportLots([]);
      setImportError("");
      await loadLots();
    } catch {
      setStatus({ type: "err", text: "Network error importing lots." });
    } finally {
      setImportSending(false);
    }
  };

  const resendClaim = async (lot) => {
    try {
      const res = await apiFetch(`/api/residents/lots/${lot.id}/resend-claim`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setStatus({
        type: res.ok ? "ok" : "err",
        text: data.message || data.error || (res.ok ? "Claim letter sent." : "Could not send the letter."),
      });
      if (res.ok) await loadLots();
    } catch {
      setStatus({ type: "err", text: "Network error sending the claim letter." });
    }
  };

  const inviteMember = async (e) => {
    e.preventDefault();
    if (!selected || !inviteEmail.trim()) return;
    try {
      const res = await apiFetch("/api/residents/invite", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim(), address: selected.street_address }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setInviteEmail("");
        setStatus({
          type: "ok",
          text: "Invite sent. They will keep their own login and receive board mail to this street.",
        });
      } else {
        setStatus({ type: "err", text: data.error || "Could not send that invite." });
      }
    } catch {
      setStatus({ type: "err", text: "Network error sending the invite." });
    }
  };

  const transferLot = async (e) => {
    e.preventDefault();
    if (!selected) return;
    try {
      const res = await apiFetch(`/api/residents/lots/${selected.id}/transfer`, {
        method: "POST",
        body: JSON.stringify(transfer),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowTransfer(false);
        setTransfer(EMPTY_TRANSFER);
        setCreated(data.resident);
        setStatus({
          type: "ok",
          text: data.message || "Owner transferred.",
        });
        await loadLots();
      } else {
        setStatus({ type: "err", text: data.error || "Could not transfer this lot." });
      }
    } catch {
      setStatus({ type: "err", text: "Network error transferring this lot." });
    }
  };

  const removeLogin = async (person) => {
    if (!window.confirm(`Remove ${displayName(person)}'s login? They will lose access until invited again.`)) return;
    try {
      const res = await apiFetch(`/api/residents/account/${person.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus({ type: "ok", text: "Login removed." });
        await loadLots();
      } else {
        setStatus({ type: "err", text: data.error || "Could not remove that login." });
      }
    } catch {
      setStatus({ type: "err", text: "Network error removing that login." });
    }
  };

  const sendBroadcast = async (e, kind, audience) => {
    e.preventDefault();
    setSending(true);
    setEmailStatus("Sending…");
    try {
      const res = await apiFetch("/api/residents/broadcast", {
        method: "POST",
        body: JSON.stringify(
          audience === "people"
            ? {
                targetType: "people",
                selectedEmails: selectedPeople.map((person) => person.email).filter(Boolean),
                subject,
                message,
                kind,
              }
            : {
                targetType: "selected",
                selectedIds,
                subject,
                message,
                kind,
              },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEmailStatus(data.message || "Sent.");
        setSubject("");
        setMessage("");
        setCompose("");
      } else {
        setEmailStatus(data.error || "Could not send that message.");
      }
    } catch {
      setEmailStatus("Network error sending mail.");
    } finally {
      setSending(false);
    }
  };

  const emailClaimCodes = async () => {
    setSending(true);
    setEmailStatus("Sending claim letters…");
    try {
      const res = await apiFetch("/api/residents/lots/bulk-claim-letters", {
        method: "POST",
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json().catch(() => ({}));
      setEmailStatus(data.message || data.error || "Could not send those letters.");
      if (res.ok) await loadLots();
    } catch {
      setEmailStatus("Network error sending claim letters.");
    } finally {
      setSending(false);
    }
  };

  const emailWelcomeLetters = async (force = false) => {
    setSending(true);
    setEmailStatus(force ? "Sending welcome letters again…" : "Sending welcome letters…");
    try {
      const res = await apiFetch("/api/residents/lots/bulk-welcome", {
        method: "POST",
        body: JSON.stringify({
          ids: selectedIds,
          emails: selectedPeople.map((person) => person.email).filter(Boolean),
          force,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.needsConfirm) {
        setWelcomeConfirm(data);
        setEmailStatus(data.message || "Some of these already received a welcome letter.");
      } else {
        setWelcomeConfirm(null);
        setEmailStatus(data.message || data.error || "Could not send those welcome letters.");
        if (res.ok) await loadLots();
      }
    } catch {
      setEmailStatus("Network error sending welcome letters.");
    } finally {
      setSending(false);
    }
  };

  const sendLotWelcome = async (lot, force = false) => {
    try {
      const res = await apiFetch("/api/residents/lots/bulk-welcome", {
        method: "POST",
        body: JSON.stringify({ ids: [lot.id], force }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.needsConfirm && window.confirm(data.message || "A welcome letter was already sent. Send again?")) {
        return sendLotWelcome(lot, true);
      }
      setStatus({
        type: res.ok && !data.needsConfirm ? "ok" : "err",
        text: data.message || data.error || "Could not send the welcome letter.",
      });
      if (res.ok && !data.needsConfirm) await loadLots();
    } catch {
      setStatus({ type: "err", text: "Network error sending the welcome letter." });
    }
  };

  const claimedCount = lots.filter((lot) => lot.is_claimed).length;
  const loginCount = lots.reduce((sum, lot) => sum + householdOf(lot).length, 0);
  const batchMode = loaded && (selectedIds.length > 0 || selectedPeople.length > 0);
  const selectedLots = lots.filter((lot) => selectedIds.some((id) => String(id) === String(lot.id)));
  const reachableLots = selectedLots.filter(lotHasEmail);
  const printLots = selectedLots.filter((lot) => !lotHasEmail(lot));
  const claimEmailLots = selectedLots.filter((lot) => !lot.is_claimed && lot.email && lot.onboarding_token);
  const claimPrintLots = selectedLots.filter((lot) => !lot.is_claimed && (!lot.email || !lot.onboarding_token));
  const claimFlyerLots = selectedLots.filter((lot) => !lot.is_claimed && lot.onboarding_token);
  const welcomeTargets = [
    ...selectedPeople.filter((person) => person.email),
    ...selectedLots.flatMap((lot) => householdOf(lot).filter((person) => person.email)),
  ];
  const welcomeCount = new Set(welcomeTargets.map((person) => String(person.email).toLowerCase())).size;

  const startCompose = (kind, audience = "households") => {
    setCompose(kind);
    setComposeAudience(audience);
    setEmailStatus("");
    if (kind === "newsletter" && !subject) setSubject("Town Central Newsletter");
  };

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowLeft size={16} />
        Admin tools
      </button>

      <header className={styles.intro}>
        <div>
          <p className={styles.kicker}>Neighborhood</p>
          <h2>Household roster</h2>
          <p>
            One listing per street. Everyone who lives there keeps their own login, shares the
            household portal, and is included when you email that address.
          </p>
        </div>
        <div className={styles.summary}>
          <div>
            <span>Lots</span>
            <strong>{lots.length}</strong>
          </div>
          <div>
            <span>Claimed</span>
            <strong>{claimedCount}</strong>
          </div>
          <div>
            <span>Logins</span>
            <strong>{loginCount}</strong>
          </div>
        </div>
      </header>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => { setShowForm((open) => !open); setShowImport(false); setShowPrint(false); }}>
          {showForm ? "Close add-lot form" : "Add a lot"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setShowImport((open) => !open);
            setShowForm(false);
            setShowPrint(false);
          }}
        >
          {showImport ? "Close import" : "Import CSV"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setShowPrint((open) => !open);
            setShowForm(false);
            setShowImport(false);
          }}
        >
          {showPrint ? "Close print files" : "Print files"}
        </Button>
      </div>

      {showPrint && (
        <section className={styles.formCard}>
          <h3>Print files for go-live</h3>
          <p>
            Upload the board&apos;s designed PDFs. Door-drop uses one letter-size page per house and
            stamps that household&apos;s claim code. Welcome packet attaches to the existing welcome
            letter emails. Leave a blank box on the flyer, or add Acrobat fields named
            {" "}<code>claim_code</code>, <code>street_address</code>, and <code>occupant_name</code>.
          </p>

          <h4 className={styles.sectionLabel}>Door-drop flyer</h4>
          <p>
            {printFiles.door_drop
              ? `Using ${printFiles.door_drop.file_name}. Door-drop PDF will fill this file instead of the built-in flyer.`
              : "No custom flyer yet. Door-drop PDF uses the built-in Town Central layout."}
          </p>
          <div className={styles.formActions}>
            <Button type="button" onClick={() => doorDropFileRef.current?.click()} disabled={Boolean(printBusy)}>
              {printBusy === "door_drop" ? "Uploading…" : printFiles.door_drop ? "Replace flyer PDF" : "Upload flyer PDF"}
            </Button>
            {printFiles.door_drop && (
              <Button type="button" variant="ghost" onClick={() => removePrintFile("door_drop")} disabled={Boolean(printBusy)}>
                Use built-in flyer
              </Button>
            )}
            <input
              ref={doorDropFileRef}
              className={styles.hiddenInput}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                uploadPrintFile("door_drop", e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          {printFiles.door_drop && (
            <>
              <p>Where should the claim code sit if the PDF has no form field?</p>
              <div className={styles.placementRow}>
                {["upper", "center", "lower"].map((placement) => (
                  <button
                    key={placement}
                    type="button"
                    className={
                      (printFiles.door_drop.stamp?.placement || "lower") === placement
                        ? styles.placementOn
                        : styles.placement
                    }
                    onClick={() => saveDoorDropStamp({ placement })}
                  >
                    {placement === "upper" ? "Upper" : placement === "center" ? "Center" : "Lower"}
                  </button>
                ))}
              </div>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={Boolean(printFiles.door_drop.stamp?.cover)}
                  onChange={(e) => saveDoorDropStamp({ cover: e.target.checked })}
                />
                Put a white plate behind the code (use this if the flyer background is busy)
              </label>
            </>
          )}

          <h4 className={styles.sectionLabel}>Welcome packet</h4>
          <p>
            {printFiles.welcome_packet
              ? `Using ${printFiles.welcome_packet.file_name}. Welcome letter emails will attach this PDF.`
              : "No packet yet. Welcome emails send the short letter only."}
          </p>
          <div className={styles.formActions}>
            <Button type="button" onClick={() => welcomeFileRef.current?.click()} disabled={Boolean(printBusy)}>
              {printBusy === "welcome_packet" ? "Uploading…" : printFiles.welcome_packet ? "Replace packet PDF" : "Upload packet PDF"}
            </Button>
            {printFiles.welcome_packet && (
              <Button type="button" variant="ghost" onClick={() => removePrintFile("welcome_packet")} disabled={Boolean(printBusy)}>
                Remove packet
              </Button>
            )}
            <input
              ref={welcomeFileRef}
              className={styles.hiddenInput}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                uploadPrintFile("welcome_packet", e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        </section>
      )}

      {showImport && (
        <section className={styles.formCard}>
          <h3>Import lots</h3>
          <p>
            Use this for the occupied streets and the new phase that is still being built.
            A row with only an address is saved as a vacant lot (Pending Resident) until someone closes.
            Streets already on the roster are skipped.
          </p>
          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={downloadImportTemplate}>
              <Download size={14} />
              Download template
            </Button>
            <Button type="button" onClick={() => importInputRef.current?.click()}>
              <FileUp size={14} />
              Choose CSV
            </Button>
            <input
              ref={importInputRef}
              className={styles.hiddenInput}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                handleImportFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          {importError && <p className={styles.err}>{importError}</p>}
          {importLots.length > 0 && (
            <>
              <p>
                {importLots.length} row{importLots.length === 1 ? "" : "s"}
                {" · "}
                {importLots.filter((lot) => lot.email).length} with email
                {" · "}
                {importLots.filter((lot) => !lot.email).length} vacant / door-drop
                {importLots.some((lot) => lot.duplicateInFile) ? " · duplicates in the file will be skipped" : ""}
              </p>
              <div className={styles.importTableWrap}>
                <table className={styles.importTable}>
                  <thead>
                    <tr>
                      <th>Street</th>
                      <th>Name</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importLots.slice(0, 40).map((lot, index) => (
                      <tr key={`${lot.street_address}-${index}`} className={lot.duplicateInFile ? styles.importSkip : ""}>
                        <td>{lot.street_address}</td>
                        <td>{`${lot.first_name} ${lot.last_name}`.trim() || "Pending Resident"}</td>
                        <td>{lot.email || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importLots.length > 40 && <p>Showing the first 40 rows.</p>}
              </div>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={sendClaimOnImport}
                  onChange={(e) => setSendClaimOnImport(e.target.checked)}
                />
                Email claim letters now to rows that have an email
              </label>
              <div className={styles.formActions}>
                <Button type="button" onClick={runImport} disabled={importSending}>
                  {importSending ? "Importing…" : `Import ${importLots.filter((lot) => !lot.duplicateInFile).length} lots`}
                </Button>
              </div>
            </>
          )}
        </section>
      )}

      {showForm && (
        <section className={styles.formCard}>
          <h3>Add a lot</h3>
          <p>If this street is already listed, invite another household member instead of creating a second row.</p>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              saveLot(false);
            }}
          >
            <label>
              Street address
              <input
                value={form.street_address}
                onChange={(e) => setForm({ ...form, street_address: e.target.value })}
                placeholder="742 Evergreen Terrace"
                required
              />
            </label>
            <div className={styles.formRow}>
              <label>
                Occupant first name
                <input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  placeholder="Optional"
                />
              </label>
              <label>
                Occupant last name
                <input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  placeholder="Optional"
                />
              </label>
            </div>
            <label>
              Email for the claim letter
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Optional"
              />
            </label>
            <div className={styles.formActions}>
              <Button type="submit" disabled={saving}>Save lot</Button>
              <Button
                type="button"
                variant="secondary"
                disabled={saving || !form.email}
                onClick={() => saveLot(true)}
              >
                Save and email claim letter
              </Button>
            </div>
          </form>
        </section>
      )}

      {status.text && <p className={status.type === "ok" ? styles.ok : styles.err}>{status.text}</p>}

      {created?.onboarding_token && (
        <section className={styles.codeCard}>
          <div>
            <span>Claim code for {created.street_address}</span>
            <strong>{created.onboarding_token}</strong>
          </div>
          <div className={styles.codeActions}>
            <Button
              variant="secondary"
              onClick={() => handleCopy(created.onboarding_token, "created")}
            >
              <Copy size={16} />
              {copied === "created" ? "Copied" : "Copy code"}
            </Button>
            {created.email && (
              <Button variant="ghost" onClick={() => resendClaim(created)}>
                Resend letter
              </Button>
            )}
          </div>
        </section>
      )}

      <div className={`${styles.workspace} ${mobileDetail && (batchMode || selected) ? styles.workspaceDetail : ""}`}>
        <section className={styles.roll}>
          <div className={styles.tools}>
            <label className={styles.search}>
              <Search size={16} />
              <input
                type="search"
                placeholder="Name, street, or household email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className={styles.filters}>
              <button type="button" className={selectedIds.length === lots.length && lots.length ? styles.filterOn : ""} onClick={() => selectByStatus("all")}>Select all</button>
              <button type="button" onClick={() => selectByStatus("claimed")}>Select claimed</button>
              <button type="button" onClick={() => selectByStatus("unclaimed")}>Select unclaimed</button>
              <button type="button" onClick={() => selectByStatus("clear")}>Clear</button>
            </div>
          </div>

          {!loaded ? (
            <p className={styles.empty}>Loading households…</p>
          ) : visible.length === 0 ? (
            <p className={styles.empty}>
              {lots.length === 0 ? "No households on the roster yet." : "No households match that."}
            </p>
          ) : (
            <div className={styles.list}>
              {visible.map((lot) => {
                const members = householdOf(lot);
                const checked = selectedIds.some((id) => String(id) === String(lot.id));
                const peopleOn = members.some((person) => selectedPeople.some((item) => item.id === person.id));
                return (
                  <div
                    key={lot.id}
                    className={`${styles.rowBlock} ${
                      batchMode
                        ? checked || peopleOn ? styles.rowOn : ""
                        : String(lot.id) === String(selectedId) ? styles.rowOn : ""
                    }`}
                  >
                    <div className={styles.row}>
                      <label className={styles.check}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(lot.id)}
                        />
                      </label>
                      <button type="button" className={styles.rowMain} onClick={() => openLot(lot)}>
                        <strong>{lot.street_address}</strong>
                      </button>
                      <em className={lot.is_claimed ? styles.claimed : styles.pending}>
                        {lot.is_claimed ? "Claimed" : "Pending"}
                      </em>
                    </div>
                    <ul className={styles.memberList}>
                      {members.length === 0 ? (
                        <li className={styles.memberMuted}>{displayName(lot)} · no login yet</li>
                      ) : (
                        members.map((person) => (
                          <li key={person.id}>
                            <label>
                              <input
                                type="checkbox"
                                checked={selectedPeople.some((item) => item.id === person.id)}
                                onChange={() => togglePerson(person, lot.street_address)}
                                disabled={!person.email}
                              />
                              <span>{displayName(person)}</span>
                            </label>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className={styles.desk}>
          <button type="button" className={styles.mobileBack} onClick={() => setMobileDetail(false)}>
            <ArrowLeft size={16} />
            All households
          </button>

          {batchMode ? (
            <>
              <div className={styles.accountHead}>
                <div>
                  <h3>
                    {selectedPeople.length > 0 && selectedLots.length > 0
                      ? `${selectedPeople.length} people · ${selectedLots.length} streets`
                      : selectedPeople.length > 0
                        ? `${selectedPeople.length} ${selectedPeople.length === 1 ? "person" : "people"} selected`
                        : `${selectedLots.length} household${selectedLots.length === 1 ? "" : "s"} selected`}
                  </h3>
                  <p>
                    Check a name to email that person only. Check a street for household mail, claim letters, and the CSV packet.
                  </p>
                </div>
                <Button variant="ghost" onClick={() => selectByStatus("clear")}>Clear selection</Button>
              </div>

              {selectedPeople.length > 0 && (
                <>
                  <h4 className={styles.sectionLabel}>People</h4>
                  <ul className={styles.review}>
                    {selectedPeople.map((person) => (
                      <li key={person.id}>
                        <div>
                          <strong>{person.name}</strong>
                          <span>
                            {person.street}{person.email ? ` · ${person.email}` : " · no email"}
                            {person.welcome_letter_sent_at ? ` · welcome ${formatSent(person.welcome_letter_sent_at)}` : ""}
                          </span>
                        </div>
                        <button type="button" onClick={() => togglePerson({ id: person.id, email: person.email, first_name: person.name, last_name: "" }, person.street)}>Remove</button>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.formActions}>
                    <Button
                      onClick={() => startCompose("email", "people")}
                      disabled={!selectedPeople.some((person) => person.email)}
                    >
                      <Mail size={16} />
                      Email these people
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => startCompose("newsletter", "people")}
                      disabled={!selectedPeople.some((person) => person.email)}
                    >
                      Newsletter to these people
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={sending || !selectedPeople.some((person) => person.email)}
                      onClick={() => emailWelcomeLetters(false)}
                    >
                      Welcome letters
                    </Button>
                  </div>
                </>
              )}

              {selectedLots.length > 0 && (
                <>
                  <h4 className={styles.sectionLabel}>Streets</h4>
                  <p className={styles.emptyInline}>
                    Household email goes to every login at these streets. Streets without an email stay on the
                    CSV for hand delivery.
                  </p>
                  <ul className={styles.review}>
                    {selectedLots.map((lot) => (
                      <li key={lot.id}>
                        <div>
                          <strong>{lot.street_address}</strong>
                          <span>
                            {displayName(lot)}
                            {lotHasEmail(lot)
                              ? ` · ${lot.email || householdOf(lot).map((person) => person.email).filter(Boolean)[0]}`
                              : " · no email — print packet"}
                            {lot.claim_letter_sent_at ? ` · claim letter ${formatSent(lot.claim_letter_sent_at)}` : ""}
                          </span>
                        </div>
                        <button type="button" onClick={() => toggleOne(lot.id)}>Remove</button>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.formActions}>
                    <Button onClick={() => startCompose("email", "households")} disabled={reachableLots.length === 0}>
                      <Mail size={16} />
                      Email households
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => startCompose("newsletter", "households")}
                      disabled={reachableLots.length === 0}
                    >
                      Newsletter
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={sending || claimEmailLots.length === 0}
                      onClick={emailClaimCodes}
                    >
                      Email claim codes
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={sending || welcomeCount === 0}
                      onClick={() => emailWelcomeLetters(false)}
                    >
                      Email welcome letters
                    </Button>
                    <Button variant="secondary" onClick={() => downloadClaimPacket(selectedLots)}>
                      <Download size={16} />
                      Download CSV
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={claimFlyerLots.length === 0}
                      onClick={() => printDoorDrops(claimFlyerLots)}
                    >
                      <FileText size={16} />
                      Door-drop PDF
                    </Button>
                  </div>
                  {claimFlyerLots.length > 0 && (
                    <p className={styles.emptyInline}>
                      {claimFlyerLots.length} unclaimed street{claimFlyerLots.length === 1 ? "" : "s"} can print as a door-drop flyer
                      {claimPrintLots.length
                        ? ` · ${claimPrintLots.length} of those have no email`
                        : ""}
                      . One letter-size page per house.
                    </p>
                  )}
                </>
              )}

              {(compose === "email" || compose === "newsletter") && (
                <form className={styles.form} onSubmit={(e) => sendBroadcast(e, compose, composeAudience)}>
                  <h4>
                    {composeAudience === "people"
                      ? compose === "newsletter"
                        ? "Newsletter to selected people"
                        : "Email selected people"
                      : compose === "newsletter"
                        ? "Send newsletter to households"
                        : "Email households"}
                  </h4>
                  <p>
                    {composeAudience === "people"
                      ? `${selectedPeople.filter((person) => person.email).length} people will receive this.`
                      : `${reachableLots.length} household${reachableLots.length === 1 ? "" : "s"} will receive this.${
                          printLots.length
                            ? ` ${printLots.length} without email will not. Download the CSV for those streets.`
                            : ""
                        }`}
                  </p>
                  <label>
                    Subject
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
                  </label>
                  <label>
                    Message
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} required />
                  </label>
                  <div className={styles.formActions}>
                    <Button type="submit" disabled={sending}>
                      {sending ? "Sending…" : compose === "newsletter" ? "Send newsletter" : "Send email"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setCompose("")}>Cancel</Button>
                  </div>
                </form>
              )}

              {welcomeConfirm && (
                <div className={styles.confirmBox}>
                  <p>
                    {welcomeConfirm.previouslySent?.length || 0} already got a welcome letter
                    {welcomeConfirm.previouslySent?.[0]?.sent_at
                      ? ` (last ${formatSent(welcomeConfirm.previouslySent[0].sent_at)})`
                      : ""}
                    . Send again to all {welcomeConfirm.recipients} people?
                  </p>
                  <div className={styles.formActions}>
                    <Button disabled={sending} onClick={() => emailWelcomeLetters(true)}>
                      Send anyway
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setWelcomeConfirm(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {emailStatus && <p className={emailStatus.toLowerCase().includes("could not") || emailStatus.toLowerCase().includes("error") || emailStatus.toLowerCase().includes("no claim") || emailStatus.toLowerCase().includes("already received") ? styles.err : styles.ok}>{emailStatus}</p>}
            </>
          ) : !selected ? (
            <div className={styles.idle}>
              <div className={styles.idleCard}>
                <span className={styles.idleIcon} aria-hidden="true">
                  <Info size={18} />
                </span>
                <p className={styles.kicker}>Household</p>
                <h3>Select a street</h3>
                <p>
                  Click a row for the claim code, household, and mail tools. Check several streets to send letters or print flyers in a batch.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.accountHead}>
                <div>
                  <h3>{selected.street_address}</h3>
                  <p>{displayName(selected)}{selected.email ? ` · ${selected.email}` : ""}</p>
                </div>
                <em className={selected.is_claimed ? styles.claimed : styles.pending}>
                  {selected.is_claimed ? "Claimed" : "Pending"}
                </em>
              </div>

              <div className={styles.codeRow}>
                <div>
                  <span>Claim code</span>
                  <strong>{selected.onboarding_token || "—"}</strong>
                  {selected.claim_letter_sent_at && (
                    <em className={styles.sentStamp}>Letter sent {formatSent(selected.claim_letter_sent_at)}</em>
                  )}
                </div>
                {selected.onboarding_token && (
                  <Button
                    variant="secondary"
                    onClick={() => handleCopy(selected.onboarding_token, "selected")}
                  >
                    <Copy size={16} />
                    {copied === "selected" ? "Copied" : "Copy"}
                  </Button>
                )}
                {selected.onboarding_token && !selected.is_claimed && (
                  <Button variant="secondary" onClick={() => printDoorDrops([selected])}>
                    <FileText size={16} />
                    Door-drop flyer
                  </Button>
                )}
                {selected.email && (
                  <Button variant="ghost" onClick={() => resendClaim(selected)}>
                    Email claim letter
                  </Button>
                )}
                {householdOf(selected).some((person) => person.email) && (
                  <Button variant="ghost" onClick={() => sendLotWelcome(selected)}>
                    Email welcome
                  </Button>
                )}
              </div>

              <div className={styles.household}>
                <h4>Household logins</h4>
                <p>
                  These people use the same household access for dues and board mail. Each person
                  still signs in separately for The Porch and the rest of the site.
                </p>
                {householdOf(selected).length === 0 ? (
                  <p className={styles.emptyInline}>No logins yet. Send a claim letter or invite someone onto this lot.</p>
                ) : (
                  <ul>
                    {householdOf(selected).map((person) => (
                      <li key={person.id}>
                        <div>
                          <strong>{displayName(person)}</strong>
                          <span>
                            {person.email}
                            {person.welcome_letter_sent_at
                              ? ` · welcome ${formatSent(person.welcome_letter_sent_at)}`
                              : ""}
                          </span>
                        </div>
                        <button type="button" onClick={() => removeLogin(person)}>
                          Remove login
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <form className={styles.invite} onSubmit={inviteMember}>
                <label>
                  Invite another household member
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="their@email.com"
                    required
                  />
                </label>
                <Button type="submit">Send invite</Button>
              </form>

              {showTransfer ? (
                <form className={styles.form} onSubmit={transferLot}>
                  <h4>Transfer owner</h4>
                  <p>Issues a new claim code. Existing logins stay until you remove them.</p>
                  <div className={styles.formRow}>
                    <label>
                      First name
                      <input
                        value={transfer.first_name}
                        onChange={(e) => setTransfer({ ...transfer, first_name: e.target.value })}
                        required
                      />
                    </label>
                    <label>
                      Last name
                      <input
                        value={transfer.last_name}
                        onChange={(e) => setTransfer({ ...transfer, last_name: e.target.value })}
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Email
                    <input
                      type="email"
                      value={transfer.email}
                      onChange={(e) => setTransfer({ ...transfer, email: e.target.value })}
                    />
                  </label>
                  <label className={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={transfer.send_welcome}
                      onChange={(e) => setTransfer({ ...transfer, send_welcome: e.target.checked })}
                    />
                    Email the new claim letter
                  </label>
                  <div className={styles.formActions}>
                    <Button type="submit">Save transfer</Button>
                    <Button type="button" variant="ghost" onClick={() => setShowTransfer(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Button variant="secondary" onClick={() => setShowTransfer(true)}>
                  Transfer owner
                </Button>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
