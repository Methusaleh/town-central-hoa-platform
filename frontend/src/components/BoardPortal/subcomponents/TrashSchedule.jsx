import { useEffect, useState } from "react";
import Button from "../../ui/Button";
import { apiFetch } from "../../../api";
import styles from "./TrashSchedule.module.css";

const DAYS = [
  { id: 1, label: "Monday" },
  { id: 2, label: "Tuesday" },
  { id: 3, label: "Wednesday" },
  { id: 4, label: "Thursday" },
  { id: 5, label: "Friday" },
  { id: 6, label: "Saturday" },
];

function upcomingSunday() {
  const d = new Date();
  const add = (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + add);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TrashSchedule() {
  const [settings, setSettings] = useState(null);
  const [weekMode, setWeekMode] = useState("normal");
  const [weekDay, setWeekDay] = useState(6);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    apiFetch("/api/settings/trash")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        if (data?.override?.skip) setWeekMode("skip");
        else if (data?.override?.pickup_weekday != null) {
          setWeekMode("other");
          setWeekDay(data.override.pickup_weekday);
        } else setWeekMode("normal");
        setNote(data?.override?.note || "");
      })
      .catch(() => setSettings(null));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (payload) => {
    setSaving(true);
    setStatus("");
    try {
      const res = await apiFetch("/api/settings/trash", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSettings(data);
        setStatus("Saved.");
      } else {
        setStatus(data.error || "Couldn't save.");
      }
    } catch {
      setStatus("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const saveWeek = () => {
    if (weekMode === "normal") {
      return save({ pickup_weekday: settings?.pickup_weekday ?? 5, override: null });
    }
    return save({
      pickup_weekday: settings?.pickup_weekday ?? 5,
      override: {
        until: upcomingSunday(),
        skip: weekMode === "skip",
        pickup_weekday: weekMode === "other" ? weekDay : null,
        note,
      },
    });
  };

  if (!settings) return null;

  return (
    <section className={styles.card}>
      <div>
        <p className={styles.kicker}>Neighborhood</p>
        <h3>Trash night</h3>
        <p>Usual pickup is Friday. Neighbors see a reminder the evening before. Change this week for holidays or delays.</p>
      </div>
      <div className={styles.row}>
        <button
          type="button"
          className={weekMode === "normal" ? styles.on : styles.btn}
          onClick={() => setWeekMode("normal")}
        >
          Friday this week
        </button>
        <button
          type="button"
          className={weekMode === "other" ? styles.on : styles.btn}
          onClick={() => setWeekMode("other")}
        >
          Different day
        </button>
        <button
          type="button"
          className={weekMode === "skip" ? styles.on : styles.btn}
          onClick={() => setWeekMode("skip")}
        >
          No pickup
        </button>
      </div>
      {weekMode === "other" && (
        <label>
          Pickup this week
          <select value={weekDay} onChange={(e) => setWeekDay(Number(e.target.value))}>
            {DAYS.map((day) => (
              <option key={day.id} value={day.id}>
                {day.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {weekMode !== "normal" && (
        <label>
          Note on Home
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Holiday delay, skip this week…" />
        </label>
      )}
      <div className={styles.actions}>
        <Button onClick={saveWeek} disabled={saving}>
          {saving ? "Saving…" : "Update this week"}
        </Button>
        {status && <span>{status}</span>}
      </div>
    </section>
  );
}
