import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, ImagePlus } from "lucide-react";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import { apiFetch } from "../../api";
import { PATHS } from "../../layout/navConfig";
import styles from "./AnnouncementFeed.module.css";

function formatDate(dateInput) {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function clip(text, max = 140) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}

function priorityMeta(priority) {
  if (priority === "urgent") return { label: "Urgent", className: "urgent" };
  if (priority === "important") return { label: "Important", className: "important" };
  return null;
}

export default function AnnouncementFeed({ user }) {
  const { announcementId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [unpublishId, setUnpublishId] = useState(null);

  const isAdmin = user?.role === "board_member" || user?.role === "super_admin";

  const load = async () => {
    try {
      const res = await apiFetch("/api/announcements");
      const data = await res.json();
      if (res.ok) {
        const list = Array.isArray(data.announcements) ? data.announcements : [];
        setItems(isAdmin ? list : list.filter((item) => !item.is_removed));
      }
    } catch (err) {
      console.error("Error fetching announcements:", err);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    load();
  }, [isAdmin]);

  const active = items.find((item) => String(item.id) === String(announcementId));

  const handlePin = async (item) => {
    if (!item?.id) return;
    try {
      const res = await apiFetch(`/api/announcements/${item.id}/pin`, {
        method: "PATCH",
        body: JSON.stringify({ is_sticky: !item.is_sticky }),
      });
      if (res.ok) load();
    } catch (err) {
      console.error("Pin failed:", err);
    }
  };

  const handleUnpublish = async () => {
    if (!unpublishId) return;
    try {
      const res = await apiFetch(`/api/announcements/${unpublishId}/moderate`, {
        method: "PATCH",
        body: JSON.stringify({ removal_reason: "Unpublished by the board" }),
      });
      if (res.ok) {
        setUnpublishId(null);
        if (String(announcementId) === String(unpublishId)) navigate(PATHS.announcements);
        load();
      }
    } catch (err) {
      console.error("Unpublish failed:", err);
    }
  };

  if (announcementId) {
    return (
      <div className={styles.page}>
        <button type="button" className={styles.back} onClick={() => navigate(PATHS.announcements)}>
          <ArrowLeft size={16} />
          All announcements
        </button>

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : !active ? (
          <div className={styles.empty}>
            That notice isn't posted anymore.
            <Link to={PATHS.announcements} className={styles.emptyLink}>
              Back to announcements
            </Link>
          </div>
        ) : (
          <Notice
            item={active}
            isAdmin={isAdmin}
            onPin={() => handlePin(active)}
            onUnpublish={() => setUnpublishId(active.id)}
          />
        )}

        {unpublishId && (
          <UnpublishModal onCancel={() => setUnpublishId(null)} onConfirm={handleUnpublish} />
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <div>
          <p className={styles.kicker}>From the board</p>
          <h2>Announcements</h2>
          <p>Official notices from the board. These are posted for the neighborhood to read, not a place to reply.</p>
        </div>
        {isAdmin && <Button onClick={() => setShowCreate(true)}>Post announcement</Button>}
      </header>

      {!loaded ? (
        <div className={styles.empty}>Loading…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>No announcements yet.</div>
      ) : (
        <div className={styles.list}>
          {items.map((item) => {
            const priority = priorityMeta(item.priority);
            return (
              <div
                key={item.id}
                className={`${styles.row} ${item.is_sticky ? styles.rowPinned : ""} ${item.is_removed ? styles.rowRemoved : ""}`}
              >
                <Link to={`${PATHS.announcements}/${item.id}`} className={styles.rowMain}>
                  <div className={styles.rowCopy}>
                    <div className={styles.meta}>
                      {item.is_sticky && <span className={styles.pin}>Pinned</span>}
                      {priority && (
                        <span className={`${styles.flag} ${styles[priority.className]}`}>{priority.label}</span>
                      )}
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p className={item.is_removed ? styles.removed : ""}>{clip(item.content, 150)}</p>
                  </div>
                  {item.image_url && !item.is_removed && (
                    <img src={item.image_url} alt="" className={styles.thumb} />
                  )}
                </Link>
                {isAdmin && !item.is_removed && (
                  <button
                    type="button"
                    className={styles.pinBtn}
                    onClick={() => handlePin(item)}
                  >
                    {item.is_sticky ? "Unpin" : "Pin"}
                  </button>
                )}
                <ChevronRight size={16} className={styles.chevron} />
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(created) => {
            setShowCreate(false);
            load();
            if (created?.id) navigate(`${PATHS.announcements}/${created.id}`);
          }}
        />
      )}

      {unpublishId && (
        <UnpublishModal onCancel={() => setUnpublishId(null)} onConfirm={handleUnpublish} />
      )}
    </div>
  );
}

function Notice({ item, isAdmin, onPin, onUnpublish }) {
  const priority = priorityMeta(item.priority);
  return (
    <article className={`${styles.notice} ${item.is_sticky ? styles.noticePinned : ""}`}>
      <div className={styles.noticeMeta}>
        {item.is_sticky && <span className={styles.pin}>Pinned</span>}
        {priority && <span className={`${styles.flag} ${styles[priority.className]}`}>{priority.label}</span>}
        <span>Posted {formatDate(item.created_at)}</span>
      </div>
      <div className={styles.noticeHead}>
        <h2>{item.title}</h2>
        {isAdmin && !item.is_removed && (
          <div className={styles.noticeActions}>
            <button type="button" className={styles.pinBtn} onClick={onPin}>
              {item.is_sticky ? "Unpin" : "Pin to top"}
            </button>
            <button type="button" className={styles.unpublish} onClick={onUnpublish}>
              Unpublish
            </button>
          </div>
        )}
      </div>
      <p className={`${styles.body} ${item.is_removed ? styles.removed : ""}`}>{item.content}</p>
      {item.image_url && !item.is_removed && (
        <img src={item.image_url} alt="" className={styles.figure} />
      )}
    </article>
  );
}

function CreateModal({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("normal");
  const [isSticky, setIsSticky] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

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
    if (!title.trim() || !content.trim()) return;
    setPosting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", content.trim());
      formData.append("priority", priority);
      formData.append("is_sticky", isSticky);
      formData.append("channel_type", "general");
      if (file) formData.append("image", file);

      const res = await apiFetch("/api/announcements", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok) onCreated(data);
      else setError(data.error || "Couldn't publish that announcement.");
    } catch {
      setError("Network error posting announcement.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal
      wide
      title="Post an announcement"
      description="This goes out as an official board notice — not a post on The Porch."
      onClose={onClose}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Irrigation shutdown Tuesday" />
        </label>
        <label>
          Notice
          <textarea
            rows="6"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            placeholder="What neighbors need to know."
          />
        </label>
        <div className={styles.formRow}>
          <label>
            Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="normal">Standard</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={isSticky} onChange={(e) => setIsSticky(e.target.checked)} />
            Pin to the top of the list
          </label>
        </div>
        <label>
          Photo (optional)
          {preview ? (
            <img src={preview} alt="" className={styles.preview} />
          ) : (
            <button type="button" className={styles.fileBtn} onClick={() => fileRef.current?.click()}>
              <ImagePlus size={16} />
              Attach a photo
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files[0] || null)} />
        </label>
        {error && <p className={styles.formError}>{error}</p>}
        <div className={styles.formActions}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={posting || !title.trim() || !content.trim()}>
            {posting ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function UnpublishModal({ onCancel, onConfirm }) {
  return (
    <Modal
      title="Unpublish this notice?"
      description="Neighbors will no longer see it on the announcements page."
      onClose={onCancel}
    >
      <div className={styles.formActions}>
        <Button variant="secondary" onClick={onCancel}>
          Keep it posted
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Unpublish
        </Button>
      </div>
    </Modal>
  );
}
