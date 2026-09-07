export const EVENT_TYPES = {
  gathering: {
    id: "gathering",
    label: "Gathering",
    kicker: "Neighborhood gathering",
    blurb: "A hangout on the block — no agenda, just neighbors.",
    rsvp: "I'm going",
    rsvpDone: "Going",
    fields: [
      { key: "host", label: "Host", placeholder: "Who's putting this on?" },
      { key: "bring", label: "What to bring", placeholder: "A chair, a side, nothing at all…" },
      { key: "rain", label: "If it rains", placeholder: "Move to the clubhouse, postpone…" },
    ],
  },
  cookout: {
    id: "cookout",
    label: "Cookout",
    kicker: "Cookout",
    blurb: "Grill, sides, and a table that keeps growing.",
    rsvp: "I'm going",
    rsvpDone: "Going",
    fields: [
      { key: "menu", label: "On the grill", placeholder: "Burgers, dogs, veggie options…" },
      { key: "bring", label: "What to bring", placeholder: "A side, drinks, a lawn chair…" },
      { key: "rain", label: "If it rains", placeholder: "We'll squeeze onto porches…" },
    ],
  },
  kids: {
    id: "kids",
    label: "Kids",
    kicker: "For the kids",
    blurb: "Play, crafts, or a parade — built for little neighbors.",
    rsvp: "We're coming",
    rsvpDone: "Coming",
    fields: [
      { key: "ages", label: "Ages", placeholder: "All ages, 5–10, toddlers…" },
      { key: "bring", label: "What to bring", placeholder: "Bikes, helmets, a snack…" },
      { key: "notes", label: "Drop-off / pickup", placeholder: "Parents stay, or pickup at 4…" },
    ],
  },
  meeting: {
    id: "meeting",
    label: "Meeting",
    kicker: "Board meeting",
    blurb: "Official HOA business. Come if it affects your street.",
    rsvp: "I'll attend",
    rsvpDone: "Attending",
    fields: [
      { key: "agenda", label: "Agenda", placeholder: "Budget, landscaping, open floor…" },
      { key: "who", label: "Who should come", placeholder: "All residents, board + guests…" },
    ],
  },
  pool: {
    id: "pool",
    label: "Pool",
    kicker: "Pool day",
    blurb: "Swim hours, splash party, or a quiet afternoon in the water.",
    rsvp: "I'll be there",
    rsvpDone: "Going",
    fields: [
      { key: "hours", label: "Hours", placeholder: "Noon–6, or until dusk…" },
      { key: "bring", label: "What to bring", placeholder: "Towel, sunscreen, float…" },
      { key: "notes", label: "Notes", placeholder: "Adults must stay with kids under 12…" },
    ],
  },
};

export const EVENT_TYPE_LIST = Object.values(EVENT_TYPES);

export function typeMeta(type) {
  return EVENT_TYPES[type] || EVENT_TYPES.gathering;
}

export function formatEventDate(dateInput) {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function eventDateParts(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return { month: "—", day: "–", weekday: "" };
  return {
    month: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
    day: String(d.getUTCDate()),
    weekday: d.toLocaleString("en-US", { weekday: "short", timeZone: "UTC" }),
  };
}

export function formatUtcYmd(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatEventTime(timeStr) {
  if (!timeStr) return "Time TBA";
  const parts = String(timeStr).split(":");
  if (parts.length < 2) return String(timeStr);
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? "p.m." : "a.m.";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

function padHms(timeStr) {
  const raw = String(timeStr || "").trim();
  if (!raw) return "";
  const parts = raw.split(":");
  const hours = String(parts[0] ?? "0").padStart(2, "0");
  const minutes = String(parts[1] ?? "00").padStart(2, "0");
  const seconds = String(parts[2] ?? "00").padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function addOneHour(ymd, hms) {
  const [hours, minutes, seconds] = hms.split(":").map((part) => Number(part) || 0);
  const nextHours = hours + 1;
  if (nextHours < 24) {
    return {
      ymd,
      hms: `${String(nextHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
    };
  }
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return { ymd: formatUtcYmd(d), hms: `00:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` };
}

export function googleCalendarUrl(event) {
  const dateStr = formatUtcYmd(event.event_date).replace(/-/g, "");
  if (!dateStr) return "#";
  let dates = `${dateStr}/${dateStr}`;
  if (event.event_time) {
    const compact = padHms(event.event_time).replace(/:/g, "").slice(0, 4);
    const end = addOneHour(formatUtcYmd(event.event_date), padHms(event.event_time));
    const endCompact = end.hms.replace(/:/g, "").slice(0, 4);
    dates = `${dateStr}T${compact}00/${end.ymd.replace(/-/g, "")}T${endCompact}00`;
  }
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title || "",
    dates,
    details: event.description || "",
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(event) {
  const ymd = formatUtcYmd(event.event_date);
  if (!ymd) return "#";
  const params = new URLSearchParams({
    rru: "addevent",
    subject: event.title || "",
    body: event.description || "",
    location: event.location || "",
  });
  if (event.event_time) {
    const start = padHms(event.event_time);
    const end = addOneHour(ymd, start);
    params.set("startdt", `${ymd}T${start}`);
    params.set("enddt", `${end.ymd}T${end.hms}`);
  } else {
    params.set("startdt", ymd);
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    params.set("enddt", formatUtcYmd(d));
    params.set("allday", "true");
  }
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function mapsUrl(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function icsEscape(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function icsStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function eventIcs(event) {
  const dateStr = formatUtcYmd(event.event_date).replace(/-/g, "");
  const uid = `event-${event.id || dateStr}@towncentralhoa.org`;
  const summary = icsEscape(event.title);
  const location = icsEscape(event.location);
  const description = icsEscape(
    [event.description, event.location].filter(Boolean).join("\n"),
  );
  let startLine = `DTSTART;VALUE=DATE:${dateStr}`;
  let endLine = "";
  if (event.event_time) {
    const compact = String(event.event_time).replace(/:/g, "").slice(0, 4).padEnd(4, "0");
    const hours = Number(compact.slice(0, 2));
    const mins = Number(compact.slice(2, 4));
    const endHours = String((hours + 1) % 24).padStart(2, "0");
    const endMins = String(mins).padStart(2, "0");
    startLine = `DTSTART:${dateStr}T${compact}00`;
    endLine = `DTEND:${dateStr}T${endHours}${endMins}00`;
  }
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Town Central HOA//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${icsStamp()}`,
    startLine,
    endLine,
    `SUMMARY:${summary}`,
    location ? `LOCATION:${location}` : "",
    description ? `DESCRIPTION:${description}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

export function openEventIcs(event) {
  const blob = new Blob([eventIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function coverFor(event) {
  return event?.cover_url || "";
}

export function isUpcoming(event, todayYmd) {
  return formatUtcYmd(event.event_date) >= todayYmd;
}
