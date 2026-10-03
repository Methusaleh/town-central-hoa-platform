import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Button from "../../ui/Button";
import { apiFetch } from "../../../api";
import styles from "./SiteLook.module.css";

const EMPTY_CARD = { name: "", title: "", blurb: "" };

export default function SiteLook({ onBack }) {
  const [photos, setPhotos] = useState([]);
  const [cards, setCards] = useState([]);
  const [landing, setLanding] = useState(null);
  const [civic, setCivic] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [uploading, setUploading] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [savingCivic, setSavingCivic] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_CARD);
  const [cardPhoto, setCardPhoto] = useState(null);
  const photoInput = useRef(null);
  const landingInput = useRef(null);
  const formRef = useRef(null);

  const load = async () => {
    try {
      const [photoRes, cardRes, landingRes, civicRes] = await Promise.all([
        apiFetch("/api/site/home-photos"),
        apiFetch("/api/site/board-cards"),
        apiFetch("/api/site/landing-hero"),
        apiFetch("/api/site/civic-guide"),
      ]);
      const photoData = await photoRes.json().catch(() => []);
      const cardData = await cardRes.json().catch(() => []);
      const landingData = await landingRes.json().catch(() => null);
      const civicData = await civicRes.json().catch(() => []);
      setPhotos(Array.isArray(photoData) ? photoData : []);
      setCards(Array.isArray(cardData) ? cardData : []);
      setLanding(landingData);
      setCivic(Array.isArray(civicData) ? civicData : []);
    } catch {
      setStatus({ type: "err", text: "Couldn't load Site look." });
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addPhotos = async (files) => {
    if (!files?.length || uploading) return;
    setUploading(true);
    setStatus({ type: "", text: "" });
    const body = new FormData();
    Array.from(files).forEach((file) => body.append("photos", file));
    try {
      const res = await apiFetch("/api/site/home-photos", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ type: "err", text: data.error || "Couldn't add those photos." });
        return;
      }
      await load();
      setStatus({ type: "ok", text: "Added to the Home rotator." });
    } catch {
      setStatus({ type: "err", text: "Network error adding photos." });
    } finally {
      setUploading(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  };

  const removePhoto = async (id) => {
    if (!window.confirm("Remove this photo from Home?")) return;
    setStatus({ type: "", text: "" });
    try {
      const res = await apiFetch(`/api/site/home-photos/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ type: "err", text: data.error || "Couldn't remove that photo." });
        return;
      }
      setPhotos((current) => current.filter((photo) => photo.id !== id));
    } catch {
      setStatus({ type: "err", text: "Network error removing that photo." });
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_CARD);
    setCardPhoto(null);
  };

  const startAdd = () => {
    setEditingId(null);
    setForm(EMPTY_CARD);
    setCardPhoto(null);
    setShowForm(true);
    setStatus({ type: "", text: "" });
  };

  const startEdit = (card) => {
    setEditingId(card.id);
    setForm({ name: card.name || "", title: card.title || "", blurb: card.blurb || "" });
    setCardPhoto(null);
    setShowForm(true);
    setStatus({ type: "", text: "" });
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };

  const saveCard = async (e) => {
    e.preventDefault();
    if (savingCard) return;
    setSavingCard(true);
    setStatus({ type: "", text: "" });
    const body = new FormData();
    body.append("name", form.name);
    body.append("title", form.title);
    body.append("blurb", form.blurb);
    if (cardPhoto) body.append("photo", cardPhoto);
    try {
      const res = await apiFetch(editingId ? `/api/site/board-cards/${editingId}` : "/api/site/board-cards", {
        method: editingId ? "PATCH" : "POST",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ type: "err", text: data.error || "Couldn't save that card." });
        return;
      }
      closeForm();
      await load();
      setStatus({ type: "ok", text: editingId ? "Board card updated." : "Added to The Board." });
    } catch {
      setStatus({ type: "err", text: "Network error saving that card." });
    } finally {
      setSavingCard(false);
    }
  };

  const removeCard = async (id) => {
    if (!window.confirm("Remove this person from The Board page?")) return;
    setStatus({ type: "", text: "" });
    try {
      const res = await apiFetch(`/api/site/board-cards/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ type: "err", text: data.error || "Couldn't remove that card." });
        return;
      }
      setCards((current) => current.filter((card) => card.id !== id));
      if (editingId === id) closeForm();
    } catch {
      setStatus({ type: "err", text: "Network error removing that card." });
    }
  };

  const replaceCover = async (file) => {
    if (!file || coverBusy) return;
    setCoverBusy(true);
    setStatus({ type: "", text: "" });
    const body = new FormData();
    body.append("media", file);
    try {
      const res = await apiFetch("/api/site/landing-hero", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ type: "err", text: data.error || "Couldn't save that cover." });
        return;
      }
      setLanding(data);
      setStatus({ type: "ok", text: data.kind === "video" ? "Landing video updated." : "Landing photo updated." });
    } catch {
      setStatus({ type: "err", text: "Network error saving the landing cover." });
    } finally {
      setCoverBusy(false);
      if (landingInput.current) landingInput.current.value = "";
    }
  };

  const setCivicField = (columnId, cardId, field, value) => {
    setCivic((current) =>
      current.map((column) =>
        column.columnId !== columnId
          ? column
          : {
              ...column,
              cards: column.cards.map((card) =>
                card.id === cardId ? { ...card, [field]: value } : card,
              ),
            },
      ),
    );
  };

  const saveCivic = async (e) => {
    e.preventDefault();
    if (savingCivic) return;
    setSavingCivic(true);
    setStatus({ type: "", text: "" });
    const cardsPayload = {};
    civic.forEach((column) => {
      (column.cards || []).forEach((card) => {
        cardsPayload[card.id] = { detail: card.detail || "", phone: card.phone || "" };
      });
    });
    try {
      const res = await apiFetch("/api/site/civic-guide", {
        method: "PUT",
        body: JSON.stringify({ cards: cardsPayload }),
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setStatus({ type: "err", text: data.error || "Couldn't save Who to call." });
        return;
      }
      setCivic(Array.isArray(data) ? data : civic);
      setStatus({ type: "ok", text: "Who to call updated." });
    } catch {
      setStatus({ type: "err", text: "Network error saving Who to call." });
    } finally {
      setSavingCivic(false);
    }
  };

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowLeft size={16} />
        Admin
      </button>

      <header className={styles.intro}>
        <div>
          <p className={styles.kicker}>Board</p>
          <h2>Site look</h2>
          <p>Landing cover, Home photos, The Board cards, and Who to call. Neighbors see these; you can change the fill-ins here.</p>
        </div>
      </header>

      {status.text ? <p className={status.type === "err" ? styles.err : styles.ok}>{status.text}</p> : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h3>Landing cover</h3>
            <p>
              The photo or looping video on the public homepage. A still photo is fine; a drone clip works too.
              If a large video doesn’t play, Aaron can help.
            </p>
          </div>
          <Button type="button" onClick={() => landingInput.current?.click()} disabled={coverBusy}>
            {coverBusy ? "Uploading…" : "Replace cover"}
          </Button>
          <input
            ref={landingInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            hidden
            onChange={(e) => replaceCover(e.target.files?.[0])}
          />
        </div>
        {landing?.file_url ? (
          <div className={styles.coverPreview}>
            {landing.kind === "video" ? (
              <video src={landing.file_url} muted playsInline controls />
            ) : (
              <img src={landing.file_url} alt="" style={{ objectPosition: landing.object_position }} />
            )}
          </div>
        ) : (
          <p className={styles.empty}>Loading cover…</p>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h3>Home photos</h3>
            <p>Up to 20. The site fills the Home box and clips the edges — pick photos with faces toward the middle.</p>
          </div>
          <Button type="button" onClick={() => photoInput.current?.click()} disabled={uploading || photos.length >= 20}>
            {uploading ? "Uploading…" : "Add photos"}
          </Button>
          <input
            ref={photoInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            hidden
            onChange={(e) => addPhotos(e.target.files)}
          />
        </div>
        {!loaded ? (
          <p className={styles.empty}>Loading…</p>
        ) : photos.length === 0 ? (
          <p className={styles.empty}>No Home photos yet. Add a few from neighborhood events.</p>
        ) : (
          <ul className={styles.thumbs}>
            {photos.map((photo) => (
              <li key={photo.id}>
                <img src={photo.file_url} alt="" />
                <button type="button" onClick={() => removePhoto(photo.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h3>The Board</h3>
            <p>Name, title, photo, and blurb on The Board page. This does not change who can log into Admin.</p>
          </div>
          <Button type="button" onClick={startAdd}>
            Add card
          </Button>
        </div>

        {showForm && (
          <form className={styles.formCard} onSubmit={saveCard} ref={formRef}>
            <h3>{editingId ? "Edit card" : "New card"}</h3>
            <div className={styles.formRow}>
              <label>
                Name
                <input
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  required
                />
              </label>
              <label>
                Title
                <input
                  value={form.title}
                  onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                  placeholder="Secretary / Treasurer"
                />
              </label>
            </div>
            <label>
              Blurb
              <textarea
                value={form.blurb}
                onChange={(e) => setForm((current) => ({ ...current, blurb: e.target.value }))}
                required
              />
            </label>
            <label>
              Photo
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCardPhoto(e.target.files?.[0] || null)} />
            </label>
            <div className={styles.formActions}>
              <Button type="submit" disabled={savingCard}>
                {savingCard ? "Saving…" : "Save"}
              </Button>
              <Button type="button" variant="secondary" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {!loaded ? null : cards.length === 0 ? (
          <p className={styles.empty}>No Board cards yet.</p>
        ) : (
          <ul className={styles.cardList}>
            {cards.map((card) => (
              <li key={card.id} className={styles.person}>
                {card.photo_url ? <img src={card.photo_url} alt="" /> : <div className={styles.photoGap} />}
                <div>
                  <strong>{card.name}</strong>
                  <span>{card.title}</span>
                  <p>{card.blurb}</p>
                  <div className={styles.formActions}>
                    <Button type="button" variant="secondary" onClick={() => startEdit(card)}>
                      Edit
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => removeCard(card.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h3>Who to call</h3>
            <p>
              Phone and department line on the existing cards. New sections stay with Aaron.
            </p>
          </div>
        </div>
        {civic.length ? (
          <form className={styles.formCard} onSubmit={saveCivic}>
            {civic.map((column) => (
              <div key={column.columnId} className={styles.civicColumn}>
                <h4>{column.column}</h4>
                {(column.cards || []).map((card) => (
                  <fieldset key={card.id} className={styles.civicCard}>
                    <legend>{card.title}</legend>
                    <div className={styles.formRow}>
                      <label>
                        Label
                        <input
                          value={card.detail || ""}
                          onChange={(e) => setCivicField(column.columnId, card.id, "detail", e.target.value)}
                        />
                      </label>
                      <label>
                        Phone
                        <input
                          value={card.phone || ""}
                          onChange={(e) => setCivicField(column.columnId, card.id, "phone", e.target.value)}
                          placeholder="405-555-0100"
                        />
                      </label>
                    </div>
                  </fieldset>
                ))}
              </div>
            ))}
            <div className={styles.formActions}>
              <Button type="submit" disabled={savingCivic}>
                {savingCivic ? "Saving…" : "Save Who to call"}
              </Button>
            </div>
          </form>
        ) : loaded ? (
          <p className={styles.empty}>Couldn’t load Who to call.</p>
        ) : null}
      </section>
    </div>
  );
}
