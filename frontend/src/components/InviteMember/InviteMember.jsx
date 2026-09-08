import { useState } from "react";
import styles from "./InviteMember.module.css";
import { apiFetch } from "../../api";

export default function InviteMember({ user }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    const next = email.trim().toLowerCase();
    if (!next || sending) return;
    if (next === String(user?.email || "").trim().toLowerCase()) {
      setStatus("Use a different email than the one you signed in with.");
      return;
    }

    setSending(true);
    setStatus("");
    try {
      const res = await apiFetch("/api/residents/invite", {
        method: "POST",
        body: JSON.stringify({
          email: next,
          primary_resident_id: user.id,
          address: user.address,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus(`Invite sent to ${next}. They’ll get their own login for this house.`);
        setEmail("");
      } else {
        setStatus(data.error || "Could not send that invite.");
      }
    } catch {
      setStatus("Network error sending the invite.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.inviteContainer}>
      <h4>Anyone else at this address?</h4>
      <p>
        Invite a spouse, partner, or anyone else who lives here. They get their own login.
        Don’t share yours.
      </p>
      <form onSubmit={handleInvite} className={styles.form}>
        <input
          type="email"
          placeholder="their@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" className={styles.btn} disabled={sending}>
          {sending ? "Sending…" : "Send invite"}
        </button>
      </form>
      {status && <p className={styles.status}>{status}</p>}
    </div>
  );
}
