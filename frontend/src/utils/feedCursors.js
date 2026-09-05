const STORAGE_PREFIX = "tc_feed_cursors_";
const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const FEED_TABS = ["announcements", "alerts", "watercooler"];

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId || "anon"}`;
}

export function readFeedCursors(userId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId)) || "{}");
  } catch {
    return {};
  }
}

export function markFeedSeen(userId, feed) {
  if (!FEED_TABS.includes(feed)) return;
  const cursors = readFeedCursors(userId);
  cursors[feed] = new Date().toISOString();
  localStorage.setItem(storageKey(userId), JSON.stringify(cursors));
}

export function countUnseen(items, cursorIso, dateField = "created_at") {
  const threshold = cursorIso
    ? new Date(cursorIso).getTime()
    : Date.now() - NEW_WINDOW_MS;

  if (Number.isNaN(threshold)) return 0;

  return (Array.isArray(items) ? items : []).filter((item) => {
    const stamp = new Date(item?.[dateField]).getTime();
    return !Number.isNaN(stamp) && stamp > threshold;
  }).length;
}

export { FEED_TABS };
