import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, ImagePlus, X } from "lucide-react";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import { apiFetch } from "../../api";
import { PATHS } from "../../layout/navConfig";
import styles from "./CommunityAlerts.module.css";

const CATEGORIES = [
  {
    id: "Lost Pet",
    label: "Lost or found pet",
    kicker: "Pet",
    hint: "Photo helps a lot. Include where and when. Neighbors can reply with a sighting photo.",
  },
  {
    id: "Traffic / Party",
    label: "Street / traffic",
    kicker: "Street",
    hint: "Road closed, extra cars, a party on the block.",
  },
  {
    id: "Safety Alert",
    label: "Safety",
    kicker: "Safety",
    hint: "Weather, a downed limb, something neighbors should watch for.",
  },
];

const REMOVE_REASONS = [
  "Not a time-sensitive neighborhood alert",
  "Better sent privately to the board",
  "Unsafe or unauthorized media",
  "Unkind or disrespectful tone",
];

function categoryMeta(id) {
  return CATEGORIES.find((item) => item.id === id) || CATEGORIES[2];
}

function relativeTime(dateInput) {
  if (!dateInput) return "";
  const then = new Date(dateInput).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateInput).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function clip(text, max = 140) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}

function toneClass(category) {
  if (category === "Lost Pet") return "pet";
  if (category === "Traffic / Party") return "street";
  return "safety";
}

function isLostPet(category) {
  return category === "Lost Pet";
}

function closeCopy(category) {
  if (category === "Lost Pet") return { action: "Mark as found", done: "Found" };
  if (category === "Traffic / Party") return { action: "Mark street open", done: "Street is open" };
  return { action: "Mark all clear", done: "All clear" };
}

function isResolved(alert) {
  return Boolean(alert?.resolved_at);
}

function canResolve(user, alert) {
  if (!user || !alert || alert.is_removed) return false;
  if (user.role === "board_member" || user.role === "super_admin") return true;
  const email = String(user.email || "").trim().toLowerCase();
  if (email && String(alert.author_email || "").trim().toLowerCase() === email) return true;
  const name = `${user.first_name || ""} ${user.last_name || ""}`.trim().toLowerCase();
  return Boolean(name) && name === String(alert.author || "").trim().toLowerCase();
}

const PHOTO_PLACEHOLDER = "Shared a photo";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function pickImageFile(files) {
  return Array.from(files || []).find((file) => file.type.startsWith("image/")) || null;
}

export default function CommunityAlerts({ user }) {
  const { alertId } = useParams();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [commentsMap, setCommentsMap] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [removeItem, setRemoveItem] = useState(null);
  const [reason, setReason] = useState(REMOVE_REASONS[0]);
  const [sighting, setSighting] = useState("");
  const [sightingFile, setSightingFile] = useState(null);
  const [sightingPreview, setSightingPreview] = useState("");
  const [draggingSighting, setDraggingSighting] = useState(false);
  const [postingSighting, setPostingSighting] = useState(false);
  const [sightingError, setSightingError] = useState("");
  const [lightbox, setLightbox] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const sightingFileRef = useRef(null);
  const dragCount = useRef(0);

  const isAdmin = user?.role === "board_member" || user?.role === "super_admin";

  const load = async () => {
    try {
      const res = await apiFetch("/api/alerts");
      const data = await res.json();
      if (res.ok) {
        const list = Array.isArray(data.alerts) ? data.alerts : [];
        setAlerts(isAdmin ? list : list.filter((item) => !item.is_removed));
        const map = {};
        (data.comments || []).forEach((comment) => {
          if (!map[comment.alert_id]) map[comment.alert_id] = [];
          map[comment.alert_id].push(comment);
        });
        setCommentsMap(map);
      }
    } catch (err) {
      console.error("Error fetching alerts:", err);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    load();
  }, [isAdmin]);

  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setLightbox("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  useEffect(() => {
    setSighting("");
    setSightingFile(null);
    setSightingError("");
    setDraggingSighting(false);
    setResolveError("");
    dragCount.current = 0;
  }, [alertId]);

  useEffect(() => {
    if (!sightingFile) {
      setSightingPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(sightingFile);
    setSightingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [sightingFile]);

  const active = alerts.find((item) => String(item.id) === String(alertId));
  const sightings = active ? commentsMap[active.id] || [] : [];
  const liveAlerts = alerts.filter((item) => !isResolved(item));
  const resolvedAlerts = alerts.filter((item) => isResolved(item));

  const attachSightingPhoto = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSightingError("Use a photo file.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setSightingError("Photos need to be under 5MB.");
      return;
    }
    setSightingError("");
    setSightingFile(file);
  };

  const handleSighting = async () => {
    if (!active || postingSighting) return;
    if (!sighting.trim() && !sightingFile) return;
    setPostingSighting(true);
    setSightingError("");
    try {
      const formData = new FormData();
      formData.append("author_name", `${user?.first_name || "Neighbor"} ${user?.last_name || ""}`.trim());
      formData.append("content", sighting.trim() || PHOTO_PLACEHOLDER);
      if (sightingFile) formData.append("image", sightingFile);

      const res = await apiFetch(`/api/alerts/${active.id}/comments`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSighting("");
        setSightingFile(null);
        if (sightingFileRef.current) sightingFileRef.current.value = "";
        load();
      } else {
        setSightingError(data.error || "Couldn't share that sighting.");
      }
    } catch (err) {
      console.error("Sighting post failed:", err);
      setSightingError("Couldn't share that sighting.");
    } finally {
      setPostingSighting(false);
    }
  };

  const handleRemove = async () => {
    if (!removeItem) return;
    try {
      const res = await apiFetch(`/api/alerts/${removeItem}/moderate`, {
        method: "PATCH",
        body: JSON.stringify({ removal_reason: reason }),
      });
      if (res.ok) {
        setRemoveItem(null);
        if (String(alertId) === String(removeItem)) navigate(PATHS.alerts);
        load();
      }
    } catch (err) {
      console.error("Remove failed:", err);
    }
  };

  const handleResolve = async (alert, reopen = false) => {
    if (!alert || resolving) return;
    setResolving(true);
    setResolveError("");
    try {
      const res = await apiFetch(`/api/alerts/${alert.id}/${reopen ? "reopen" : "resolve"}`, {
        method: "PATCH",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        load();
      } else {
        setResolveError(data.error || (reopen ? "Couldn't reopen that alert." : "Couldn't resolve that alert."));
      }
    } catch (err) {
      console.error("Resolve failed:", err);
      setResolveError(reopen ? "Couldn't reopen that alert." : "Couldn't resolve that alert.");
    } finally {
      setResolving(false);
    }
  };

  if (alertId) {
    const meta = categoryMeta(active?.category);
    return (
      <div className={styles.page}>
        <button type="button" className={styles.back} onClick={() => navigate(PATHS.alerts)}>
          <ArrowLeft size={16} />
          All alerts
        </button>

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : !active ? (
          <div className={styles.empty}>
            That alert isn't posted anymore.
            <Link to={PATHS.alerts} className={styles.emptyLink}>
              Back to alerts
            </Link>
          </div>
        ) : (
          <article className={styles.detail}>
            <div className={styles.detailMeta}>
              <Avatar name={active.author} photo={active.author_photo} size="sm" />
              <span className={`${styles.flag} ${styles[toneClass(active.category)]}`}>{meta.kicker}</span>
              {isResolved(active) && (
                <span className={`${styles.flag} ${styles.resolvedFlag}`}>
                  {active.resolved_label || closeCopy(active.category).done}
                </span>
              )}
              <span>{relativeTime(active.created_at)}</span>
              <span>Posted by {active.author || "Neighbor"}</span>
            </div>
            <div className={styles.detailHead}>
              <h2>{meta.label}</h2>
              <div className={styles.detailActions}>
                {canResolve(user, active) && !isResolved(active) && (
                  <Button variant="secondary" disabled={resolving} onClick={() => handleResolve(active)}>
                    {resolving ? "Saving…" : closeCopy(active.category).action}
                  </Button>
                )}
                {canResolve(user, active) && isResolved(active) && (
                  <Button variant="ghost" disabled={resolving} onClick={() => handleResolve(active, true)}>
                    {resolving ? "Saving…" : "Reopen"}
                  </Button>
                )}
                {isAdmin && !active.is_removed && (
                  <button type="button" className={styles.remove} onClick={() => setRemoveItem(active.id)}>
                    Remove
                  </button>
                )}
              </div>
            </div>
            {isResolved(active) && (
              <p className={styles.resolvedNote}>
                {active.resolved_label || closeCopy(active.category).done}
                {active.resolved_by ? ` · ${active.resolved_by}` : ""}
                {active.resolved_at ? ` · ${relativeTime(active.resolved_at)}` : ""}
              </p>
            )}
            {resolveError && <p className={styles.formError}>{resolveError}</p>}
            <p className={`${styles.body} ${active.is_removed ? styles.removed : ""}`}>{active.content}</p>
            {active.image_url && !active.is_removed && (
              <img src={active.image_url} alt="" className={styles.figure} />
            )}
            {isLostPet(active.category) && !active.is_removed && (
              <section
                className={`${styles.sightings} ${draggingSighting ? styles.sightingsHot : ""}`}
                onDragEnter={(e) => {
                  if (isResolved(active)) return;
                  e.preventDefault();
                  dragCount.current += 1;
                  setDraggingSighting(true);
                }}
                onDragOver={(e) => {
                  if (!isResolved(active)) e.preventDefault();
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  dragCount.current = Math.max(0, dragCount.current - 1);
                  if (dragCount.current === 0) setDraggingSighting(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  dragCount.current = 0;
                  setDraggingSighting(false);
                  if (!isResolved(active)) attachSightingPhoto(pickImageFile(e.dataTransfer.files));
                }}
              >
                <h3>
                  {sightings.length
                    ? `${sightings.length} ${sightings.length === 1 ? "sighting" : "sightings"}`
                    : "Sightings"}
                </h3>
                <p className={styles.sightingLead}>
                  {isResolved(active)
                    ? "This pet was marked found. Sightings are closed."
                    : "If you see this animal, say where and when — drop a photo if you got one."}
                </p>
                {sightings.length === 0 ? (
                  <p className={styles.noSightings}>
                    {isResolved(active)
                      ? "No sightings were reported."
                      : "No sightings yet. Be the first to report one."}
                  </p>
                ) : (
                  sightings.map((item) => {
                    const note = item.content && item.content !== PHOTO_PLACEHOLDER ? item.content : "";
                    return (
                      <div key={item.id} className={styles.sighting}>
                        <Avatar name={item.author_name} photo={item.author_photo} size="sm" />
                        <div className={styles.sightingBody}>
                          <strong>
                            {item.author_name || "Neighbor"}
                            <span>{relativeTime(item.created_at)}</span>
                          </strong>
                          {note ? <p>{note}</p> : null}
                          {item.image_url && (
                            <button
                              type="button"
                              className={styles.sightingPhotoBtn}
                              onClick={() => setLightbox(item.image_url)}
                            >
                              <img src={item.image_url} alt="Sighting photo" className={styles.sightingPhoto} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                {!isResolved(active) && (
                  <>
                    {sightingError && <p className={styles.formError}>{sightingError}</p>}
                    {sightingPreview && (
                      <div className={styles.sightingPreview}>
                        <img src={sightingPreview} alt="" />
                        <button
                          type="button"
                          onClick={() => {
                            setSightingFile(null);
                            if (sightingFileRef.current) sightingFileRef.current.value = "";
                          }}
                          aria-label="Remove photo"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    <div className={styles.sightingForm}>
                      <Avatar name={user?.first_name} photo={user?.photo} size="sm" />
                      <input
                        type="text"
                        placeholder="I saw them on Oak heading toward the park…"
                        value={sighting}
                        onChange={(e) => setSighting(e.target.value)}
                        onPaste={(e) => {
                          const file = pickImageFile(e.clipboardData?.files);
                          if (file) {
                            e.preventDefault();
                            attachSightingPhoto(file);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSighting();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className={styles.attach}
                        onClick={() => sightingFileRef.current?.click()}
                        aria-label="Add a photo"
                      >
                        <ImagePlus size={16} />
                      </button>
                      <input
                        ref={sightingFileRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => attachSightingPhoto(e.target.files[0] || null)}
                      />
                      <Button
                        variant="secondary"
                        onClick={handleSighting}
                        disabled={postingSighting || (!sighting.trim() && !sightingFile)}
                      >
                        {postingSighting ? "Posting…" : "Share"}
                      </Button>
                    </div>
                    {draggingSighting && <p className={styles.dropHint}>Drop the photo here</p>}
                  </>
                )}
              </section>
            )}
          </article>
        )}

        {lightbox && (
          <button type="button" className={styles.lightbox} onClick={() => setLightbox("")}>
            <img src={lightbox} alt="" />
          </button>
        )}

        {removeItem && (
          <RemoveModal
            reason={reason}
            setReason={setReason}
            onCancel={() => setRemoveItem(null)}
            onConfirm={handleRemove}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <div>
          <p className={styles.kicker}>Neighborhood</p>
          <h2>Alerts</h2>
          <p>Time-sensitive notes for the block — a lost pet, extra traffic, something to watch for.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Post an alert</Button>
      </header>

      {!loaded ? (
        <div className={styles.empty}>Loading…</div>
      ) : liveAlerts.length === 0 && resolvedAlerts.length === 0 ? (
        <div className={styles.empty}>All clear. No active alerts.</div>
      ) : (
        <>
          {liveAlerts.length === 0 ? (
            <div className={styles.empty}>All clear. No active alerts.</div>
          ) : (
            <section>
              <h3 className={styles.sectionLabel}>Active</h3>
              <div className={styles.list}>
                {liveAlerts.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} commentsMap={commentsMap} />
                ))}
              </div>
            </section>
          )}
          {resolvedAlerts.length > 0 && (
            <section>
              <h3 className={styles.sectionLabel}>Resolved</h3>
              <div className={styles.list}>
                {resolvedAlerts.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} commentsMap={commentsMap} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {showCreate && (
        <CreateModal
          user={user}
          onClose={() => setShowCreate(false)}
          onCreated={(created) => {
            setShowCreate(false);
            load();
            if (created?.id) navigate(`${PATHS.alerts}/${created.id}`);
          }}
        />
      )}

      {removeItem && (
        <RemoveModal
          reason={reason}
          setReason={setReason}
          onCancel={() => setRemoveItem(null)}
          onConfirm={handleRemove}
        />
      )}
    </div>
  );
}

function AlertRow({ alert, commentsMap }) {
  const meta = categoryMeta(alert.category);
  const petSightings = commentsMap[alert.id] || [];
  const resolved = isResolved(alert);
  return (
    <Link
      to={`${PATHS.alerts}/${alert.id}`}
      className={`${styles.row} ${alert.is_removed ? styles.rowRemoved : ""} ${resolved ? styles.rowResolved : ""}`}
    >
      {alert.image_url && !alert.is_removed && (
        <img src={alert.image_url} alt="" className={styles.thumb} />
      )}
      <div className={styles.rowCopy}>
        <div className={styles.meta}>
          <span className={`${styles.flag} ${styles[toneClass(alert.category)]}`}>{meta.kicker}</span>
          {resolved && (
            <span className={`${styles.flag} ${styles.resolvedFlag}`}>
              {alert.resolved_label || closeCopy(alert.category).done}
            </span>
          )}
          <span>{relativeTime(resolved ? alert.resolved_at : alert.created_at)}</span>
        </div>
        <p className={alert.is_removed ? styles.removed : ""}>{clip(alert.content, 160)}</p>
        <span className={styles.who}>
          <Avatar name={alert.author} photo={alert.author_photo} size="sm" />
          Posted by {alert.author || "Neighbor"}
          {isLostPet(alert.category) &&
            !resolved &&
            (petSightings.length
              ? ` · ${petSightings.length} ${petSightings.length === 1 ? "sighting" : "sightings"}`
              : " · Ask neighbors to watch")}
        </span>
      </div>
      <ChevronRight size={16} className={styles.chevron} />
    </Link>
  );
}

function CreateModal({ user, onClose, onCreated }) {
  const [category, setCategory] = useState("Lost Pet");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const meta = categoryMeta(category);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("author", `${user?.first_name || "Neighbor"} ${user?.last_name || ""}`.trim());
      formData.append("content", content.trim());
      if (file) formData.append("image", file);

      const res = await apiFetch("/api/alerts", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok) onCreated(data);
      else setError(data.error || "Couldn't publish that alert.");
    } catch {
      setError("Network error posting alert.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal
      wide
      title="Post an alert"
      description="Keep it time-sensitive. House changes and common-area repairs go to Requests."
      onClose={onClose}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.typeGrid}>
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.typeChip} ${category === item.id ? styles.typeChipOn : ""}`}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label>
          What's going on
          <textarea
            rows="4"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={meta.hint}
            required
          />
        </label>

        <label>
          Photo {category === "Lost Pet" ? "(recommended)" : "(optional)"}
          {preview ? (
            <img src={preview} alt="" className={styles.preview} />
          ) : (
            <button type="button" className={styles.fileBtn} onClick={() => fileRef.current?.click()}>
              <ImagePlus size={16} />
              {category === "Lost Pet" ? "Add a photo of the pet" : "Attach a photo"}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files[0] || null)} />
        </label>

        {error && <p className={styles.formError}>{error}</p>}

        <div className={styles.formActions}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={posting || !content.trim()}>
            {posting ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RemoveModal({ reason, setReason, onCancel, onConfirm }) {
  return (
    <Modal
      title="Remove this alert"
      description="Neighbors will see that it was taken down."
      onClose={onCancel}
    >
      <div className={styles.reasonList}>
        {REMOVE_REASONS.map((item) => (
          <label key={item}>
            <input
              type="radio"
              name="alertReason"
              value={item}
              checked={reason === item}
              onChange={(e) => setReason(e.target.value)}
            />
            {item}
          </label>
        ))}
      </div>
      <div className={styles.formActions}>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Remove
        </Button>
      </div>
    </Modal>
  );
}
