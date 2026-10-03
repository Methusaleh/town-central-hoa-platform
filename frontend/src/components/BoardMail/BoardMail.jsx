import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Send } from "lucide-react";
import Button from "../ui/Button";
import CivicGuide from "../CivicGuide/CivicGuide";
import { apiFetch } from "../../api";
import { usePortal } from "../../layout/PortalContext";
import { BOARD_CARDS_ARE_SAMPLE, BOARD_MEMBERS } from "./boardMembers";
import styles from "./BoardMail.module.css";

function asCards(rows) {
  if (!Array.isArray(rows) || !rows.length) return [];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    title: row.title,
    photo: row.photo_url || row.photo,
    blurb: row.blurb,
  }));
}

export default function BoardMail() {
  const { user, isBoard } = usePortal();
  const [params, setParams] = useSearchParams();
  const incomingSubject = params.get("subject") || "";
  const [subject, setSubject] = useState(incomingSubject);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [members, setMembers] = useState(BOARD_MEMBERS);
  const subjectRef = useRef(null);
  const bodyRef = useRef(null);

  const fromName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Neighbor";
  const fromEmail = user?.email || "";

  useEffect(() => {
    apiFetch("/api/site/board-cards")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const next = asCards(data);
        if (next.length) setMembers(next);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (incomingSubject) {
      setSubject(incomingSubject);
      bodyRef.current?.focus();
    }
  }, [incomingSubject]);

  const reset = () => {
    setSubject("");
    setMessage("");
    setError("");
    setSent(false);
    if (incomingSubject) setParams({}, { replace: true });
    setTimeout(() => subjectRef.current?.focus(), 0);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await apiFetch("/api/requests", {
        method: "POST",
        body: JSON.stringify({
          resident_id: user?.id || null,
          first_name: user?.first_name || "Resident",
          last_name: user?.last_name || "",
          type: "Board Message",
          subject: subject.trim(),
          description: message.trim(),
        }),
      });
      if (response.ok) {
        setSent(true);
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Couldn't send that message.");
      }
    } catch {
      setError("Network error sending to the board.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.kicker}>Town Central</p>
        <h2>The Board</h2>
        <p className={styles.lede}>
          Notes stay private — they don&apos;t post to The Porch. For a common-area repair or a change to your house, use Requests.
        </p>
        {BOARD_CARDS_ARE_SAMPLE && isBoard && (
          <p className={styles.sampleNote}>
            Sample cards so the layout is clear. Swap names, photos, and blurbs when you have them.
          </p>
        )}
      </header>

      <ul className={styles.roster}>
        {members.map((member) => (
          <li key={member.id} className={styles.card}>
            {member.photo ? <img src={member.photo} alt="" /> : <div className={styles.photoGap} />}
            <div className={styles.cardBody}>
              <p className={styles.role}>{member.title}</p>
              <h3>{member.name}</h3>
              <p>{member.blurb}</p>
            </div>
          </li>
        ))}
      </ul>

      <section className={styles.write}>
        <p className={styles.kicker}>Write a note</p>
        <h3>Private email to the board</h3>
        <p>They will reply to the email on your account.</p>
      </section>

      {sent ? (
        <div className={styles.letter}>
          <div className={styles.sent}>
            <span className={styles.sentMark}>
              <Check size={22} />
            </span>
            <h3>Sent</h3>
            <p>The board has this in their inbox. They will reply to {fromEmail || "the email on your account"}.</p>
            <Button variant="secondary" onClick={reset}>
              Write another
            </Button>
          </div>
        </div>
      ) : (
        <form className={styles.letter} onSubmit={handleSend}>
          <div className={styles.toolbar}>
            <span>New message</span>
            <Button type="submit" disabled={sending || !subject.trim() || !message.trim()}>
              <Send size={15} />
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>

          <div className={styles.headers}>
            <div className={styles.row}>
              <span>From</span>
              <p>
                {fromName}
                {fromEmail ? <em>{fromEmail}</em> : null}
              </p>
            </div>
            <div className={styles.row}>
              <span>To</span>
              <p>
                Town Central Board
                <em>board@towncentralhoa.org</em>
              </p>
            </div>
            <label className={styles.row}>
              <span>Subject</span>
              <input
                ref={subjectRef}
                type="text"
                required
                placeholder="What is this about?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
          </div>

          <textarea
            ref={bodyRef}
            required
            className={styles.body}
            placeholder="Write the note you would put in an envelope…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                handleSend(e);
              }
            }}
          />

          {error && <p className={styles.error}>{error}</p>}
        </form>
      )}

      <CivicGuide />
    </div>
  );
}
