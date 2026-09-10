const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function ymdLocal(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function defaults() {
  return {
    pickup_weekday: 5,
    override: null,
  };
}

function normalizeSettings(raw) {
  const base = defaults();
  const value = raw && typeof raw === "object" ? raw : {};
  const pickup = Number(value.pickup_weekday);
  let override = value.override && typeof value.override === "object" ? value.override : null;
  const today = ymdLocal();
  if (override?.until && override.until < today) override = null;
  return {
    pickup_weekday: Number.isInteger(pickup) && pickup >= 0 && pickup <= 6 ? pickup : base.pickup_weekday,
    override: override
      ? {
          until: String(override.until || "").slice(0, 10),
          skip: Boolean(override.skip),
          pickup_weekday:
            Number.isInteger(Number(override.pickup_weekday)) && Number(override.pickup_weekday) >= 0 && Number(override.pickup_weekday) <= 6
              ? Number(override.pickup_weekday)
              : null,
          note: String(override.note || "").trim(),
        }
      : null,
  };
}

function overrideActive(override, todayYmd) {
  return Boolean(override?.until && todayYmd <= override.until);
}

function effectivePickup(settings, todayYmd) {
  const current = normalizeSettings(settings);
  if (overrideActive(current.override, todayYmd)) {
    if (current.override.skip) return null;
    if (current.override.pickup_weekday != null) return current.override.pickup_weekday;
  }
  return current.pickup_weekday;
}

function remindWeekday(pickupWeekday) {
  return (Number(pickupWeekday) + 6) % 7;
}

function bannerFor(settings, now = new Date()) {
  const current = normalizeSettings(settings);
  const todayYmd = ymdLocal(now);
  const todayWeekday = now.getDay();
  const pickup = effectivePickup(current, todayYmd);
  const overrideOn = overrideActive(current.override, todayYmd);
  const note = overrideOn ? current.override.note : "";

  if (pickup == null) {
    const usualRemind = remindWeekday(current.pickup_weekday);
    if (todayWeekday !== usualRemind) return null;
    return {
      kicker: "Trash",
      text: note || "No trash pickup this week.",
    };
  }

  if (todayWeekday !== remindWeekday(pickup)) return null;

  const dayName = WEEKDAYS[pickup];
  return {
    kicker: "Trash night",
    text: note || `Put cans out tonight. Pickup is ${dayName} morning.`,
  };
}

module.exports = {
  WEEKDAYS,
  defaults,
  normalizeSettings,
  bannerFor,
  ymdLocal,
};
