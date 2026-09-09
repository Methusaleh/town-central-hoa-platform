import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { apiFetch } from "../../api";
import { EVENT_TYPE_LIST, formatUtcYmd, typeMeta } from "./eventTypes";
import styles from "./Events.module.css";

function timeInputValue(value) {
  const parts = String(value || "").split(":");
  if (parts.length < 2) return "";
  return `${String(parts[0]).padStart(2, "0")}:${String(parts[1]).padStart(2, "0")}`;
}

export default function EventCreateModal({ event = null, onClose, onSaved }) {
  const isEdit = Boolean(event?.id);
  const [type, setType] = useState(event?.event_type || "gathering");
  const [title, setTitle] = useState(event?.title || "");
  const [eventDate, setEventDate] = useState(formatUtcYmd(event?.event_date) || "");
  const [eventTime, setEventTime] = useState(timeInputValue(event?.event_time));
  const [location, setLocation] = useState(event?.location || "");
  const [description, setDescription] = useState(event?.description || "");
  const [details, setDetails] = useState(event?.details && typeof event.details === "object" ? event.details : {});
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(event?.cover_url || "");
  const [flyerFile, setFlyerFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [draggingCover, setDraggingCover] = useState(false);
  const coverRef = useRef(null);
  const coverDragCount = useRef(0);
  const meta = typeMeta(type);
  const existingFlyer = event?.attachment_name || "";

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(event?.cover_url || "");
      return undefined;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile, event?.cover_url]);

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

      const res = await apiFetch(isEdit ? `/api/events/${event.id}` : "/api/events", {
        method: isEdit ? "PATCH" : "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onSaved(data);
        onClose();
      } else {
        setError(data.error || (isEdit ? "Couldn't save those changes." : "Couldn't publish that event."));
      }
    } catch {
      setError(isEdit ? "Network error saving event." : "Network error creating event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      wide
      title={isEdit ? "Edit event" : "Create an event"}
      description={
        isEdit
          ? "Update the details neighbors will see."
          : "Pick what kind of gathering this is — the page will match."
      }
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
              {coverFile ? (
                <button
                  type="button"
                  className={styles.coverClear}
                  onClick={() => setCoverFile(null)}
                  aria-label="Remove cover"
                >
                  <X size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.coverReplace}
                  onClick={() => coverRef.current?.click()}
                >
                  Replace photo
                </button>
              )}
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
          {(flyerFile || existingFlyer) && (
            <em className={styles.fileName}>{flyerFile ? flyerFile.name : existingFlyer}</em>
          )}
        </label>

        {error && <p className={styles.formError}>{error}</p>}

        <div className={styles.formActions}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !title.trim() || !eventDate}>
            {loading ? (isEdit ? "Saving…" : "Publishing…") : isEdit ? "Save changes" : "Publish event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
