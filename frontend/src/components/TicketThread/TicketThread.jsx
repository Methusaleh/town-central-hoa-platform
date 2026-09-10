import { useState } from "react";
import Button from "../ui/Button";
import styles from "./TicketThread.module.css";

function formatWhen(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TicketThread({
  comments = [],
  canReply = false,
  boardOnly = false,
  openMessage = "",
  placeholder = "Add a note",
  onPost,
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending || !onPost) return;
    setSending(true);
    setError("");
    try {
      await onPost(body);
      setDraft("");
    } catch (err) {
      setError(err.message || "Couldn't post that.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.thread}>
      {boardOnly && <p className={styles.privateHint}>Board only — the neighbor does not see this.</p>}
      {comments.length === 0 ? (
        <p className={styles.empty}>{openMessage || (canReply ? "No notes yet." : "No notes.")}</p>
      ) : (
        <ul className={styles.list}>
          {comments.map((comment) => (
            <li key={comment.id} className={styles.item}>
              <div className={styles.meta}>
                <strong>{comment.author_name || "Neighbor"}</strong>
                <span>{formatWhen(comment.created_at)}</span>
              </div>
              <p>{comment.body}</p>
            </li>
          ))}
        </ul>
      )}
      {canReply && (
        <form className={styles.composer} onSubmit={submit}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            rows={3}
          />
          {error && <p className={styles.err}>{error}</p>}
          <Button type="submit" disabled={sending || !draft.trim()}>
            {sending ? "Posting…" : "Post note"}
          </Button>
        </form>
      )}
    </div>
  );
}
