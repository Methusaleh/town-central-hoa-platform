export const EVENT_TYPES = {
  gathering: {
    id: "gathering",
    label: "Gathering",
    kicker: "Neighborhood gathering",
    blurb: "A hangout on the block — no agenda, just neighbors.",
    rsvp: "I'm going",
    rsvpDone: "You're going",
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
    rsvpDone: "You're going",
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
    rsvpDone: "You're coming",
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
    rsvpDone: "You're attending",
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
    rsvpDone: "You're going",
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

export function googleCalendarUrl(event) {
  const dateStr = formatUtcYmd(event.event_date).replace(/-/g, "");
  if (!dateStr) return "#";
  let dates = `${dateStr}/${dateStr}`;
  if (event.event_time) {
    const compact = String(event.event_time).replace(/:/g, "").slice(0, 4);
    dates = `${dateStr}T${compact}00/${dateStr}T${compact}00`;
  }
  const details = [event.description, event.location].filter(Boolean).join("\n");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${dates}&details=${encodeURIComponent(details)}`;
}

export function mapsUrl(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export function coverFor(event) {
  if (event?.cover_url) return event.cover_url;
  const attachment = event?.attachment_url || "";
  if (/\.(png|jpe?g|gif|webp)(\?|$)/i.test(attachment)) return attachment;
  return "";
}

export function isUpcoming(event, todayYmd) {
  return formatUtcYmd(event.event_date) >= todayYmd;
}
