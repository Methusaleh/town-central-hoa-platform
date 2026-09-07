import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { apiFetch } from "../../api";
import { EVENT_TYPE_LIST, typeMeta } from "./eventTypes";
import styles from "./Events.module.css";

export default function EventCreateModal({ onClose, onCreated }) {
  const [type, setType] = useState("gathering");
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [details, setDetails] = useState({});
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [flyerFile, setFlyerFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [draggingCover, setDraggingCover] = useState(false);
  const coverRef = useRef(null);
  const coverDragCount = useRef(0);
  const meta = typeMeta(type);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const attachCover = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Cover needs to be a photo.");
      return;
    }
    setError("");
    setCoverFile(file);
    setDraggingCover(false);
    coverDragCount.current = 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("event_date", eventDate);
      formData.append("event_time", eventTime);
      formData.append("location", location.trim());
      formData.append("description", description.trim());
      formData.append("event_type", type);
      formData.append("details", JSON.stringify(details));
      if (coverFile) formData.append("cover", coverFile);
      if (flyerFile) formData.append("attachment", flyerFile);

      const res = await apiFetch("/api/events", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onCreated(data);
        onClose();
      } else {
        setError(data.error || "Couldn't publish that event.");
      }
    } catch {
      setError("Network error creating event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      wide
      title="Create an event"
      description="Pick what kind of gathering this is — the page will match."
      onClose={onClose}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.typeGrid}>
          {EVENT_TYPE_LIST.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.typeChip} ${styles[`chip_${item.id}`]} ${type === item.id ? styles.typeChipOn : ""}`}
              onClick={() => setType(item.id)}
            >
              <strong>{item.label}</strong>
              <span>{item.blurb}</span>
            </button>
          ))}
        </div>

        <label>
          Cover photo
          <span className={styles.fieldHint}>This is what neighbors see first on Home and Events.</span>
          {coverPreview ? (
            <div
              className={styles.coverPick}
              onDragEnter={(e) => {
                e.preventDefault();
                coverDragCount.current += 1;
                setDraggingCover(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => {
                coverDragCount.current = Math.max(0, coverDragCount.current - 1);
                if (coverDragCount.current === 0) setDraggingCover(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                attachCover(e.dataTransfer.files[0] || null);
              }}
            >
              <img src={coverPreview} alt="" />
              <button
                type="button"
                className={styles.coverClear}
                onClick={() => setCoverFile(null)}
                aria-label="Remove cover"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={`${styles.coverBtn} ${draggingCover ? styles.coverBtnHot : ""}`}
              onClick={() => coverRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                coverDragCount.current += 1;
                setDraggingCover(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => {
                coverDragCount.current = Math.max(0, coverDragCount.current - 1);
                if (coverDragCount.current === 0) setDraggingCover(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                attachCover(e.dataTransfer.files[0] || null);
              }}
            >
              <ImagePlus size={16} />
              {draggingCover ? "Drop the photo here" : "Add a photo, or drop one here"}
            </button>
          )}
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => attachCover(e.target.files[0] || null)}
          />
        </label>

        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === "meeting"
                ? "e.g. September board meeting"
                : type === "cookout"
                  ? "e.g. Labor Day cookout"
                  : type === "pool"
                    ? "e.g. Saturday pool hours"
                    : type === "kids"
                      ? "e.g. Bike parade"
                      : "e.g. Front-yard hang"
            }
            required
          />
        </label>

        <div className={styles.formRow}>
          <label>
            Date
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
          </label>
          <label>
            Start time
            <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
          </label>
        </div>

        <label>
          Where
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={type === "pool" ? "Community pool" : "Clubhouse, cul-de-sac, someone's yard…"}
          />
        </label>

        {meta.fields.map((field) => (
          <label key={field.key}>
            {field.label}
            {field.key === "agenda" || field.key === "notes" ? (
              <textarea
                rows="3"
                value={details[field.key] || ""}
                placeholder={field.placeholder}
                onChange={(e) => setDetails((prev) => ({ ...prev, [field.key]: e.target.value }))}
              />
            ) : (
              <input
                value={details[field.key] || ""}
                placeholder={field.placeholder}
                onChange={(e) => setDetails((prev) => ({ ...prev, [field.key]: e.target.value }))}
              />
            )}
          </label>
        ))}

        <label>
          More to know
          <textarea
            rows="3"
            value={description}
            placeholder="Anything else neighbors should know."
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className={styles.quietField}>
          Optional file
          <span className={styles.fieldHint}>
            Agenda, map, or a printable flyer. This is a download — it is not the event photo.
          </span>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => setFlyerFile(e.target.files[0] || null)}
          />
          {flyerFile && <em className={styles.fileName}>{flyerFile.name}</em>}
        </label>

        {error && <p className={styles.formError}>{error}</p>}

        <div className={styles.formActions}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !title.trim() || !eventDate}>
            {loading ? "Publishing…" : "Publish event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
