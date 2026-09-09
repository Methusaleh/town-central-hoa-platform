import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Send } from "lucide-react";
import Button from "../ui/Button";
import CivicGuide from "../CivicGuide/CivicGuide";
import { apiFetch } from "../../api";
import { usePortal } from "../../layout/PortalContext";
import styles from "./BoardMail.module.css";

export default function BoardMail() {
  const { user } = usePortal();
  const [params, setParams] = useSearchParams();
  const incomingSubject = params.get("subject") || "";
  const [subject, setSubject] = useState(incomingSubject);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const subjectRef = useRef(null);
  const bodyRef = useRef(null);

  const fromName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Neighbor";
  const fromEmail = user?.email || "";

  useEffect(() => {
    if (incomingSubject) {
      setSubject(incomingSubject);
      bodyRef.current?.focus();
    } else {
      subjectRef.current?.focus();
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
        <p className={styles.kicker}>Correspondence</p>
        <h2>Write the board</h2>
        <p>Private email to the HOA board. It does not post to the neighborhood. For a common-area repair or a change to your house, use Requests so it can be tracked.</p>
      </header>

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
