import { useEffect, useRef, useState } from "react";
import CivicGuide from "../CivicGuide/CivicGuide";
import Button from "../ui/Button";
import TicketThread from "../TicketThread/TicketThread";
import { apiFetch } from "../../api";
import { REQUEST_TYPES, requestTypeLabel, ticketStatusLabel } from "../../utils/requestTypes";
import styles from "./RequestForm.module.css";

function ticketRank(status) {
  if (status === "Open") return 0;
  if (status === "In review") return 1;
  return 2;
}

function sortTickets(list) {
  return [...list].sort((a, b) => {
    const rank = ticketRank(a.status) - ticketRank(b.status);
    if (rank) return rank;
    return new Date(b.resolved_at || b.created_at) - new Date(a.resolved_at || a.created_at);
  });
}

function TicketItem({ req, onReply }) {
  return (
    <li className={styles.ticket}>
      <div className={styles.ticketTop}>
        <span className={styles.type}>{requestTypeLabel(req.request_type)}</span>
        <span className={`${styles.status} ${styles[`st${(req.status || "Open").replace(/\s/g, "")}`]}`}>
          {ticketStatusLabel(req.status)}
        </span>
      </div>
      <strong>{req.subject}</strong>
      <p>{req.description}</p>
      <TicketThread
        comments={req.comments || []}
        canReply={req.status === "In review"}
        openMessage={
          req.status === "Open"
            ? "The board has this. They will reply once it is in review."
            : ""
        }
        placeholder="Reply to the board"
        onPost={(body) => onReply(req.id, body)}
      />
      <p className={styles.when}>{new Date(req.created_at).toLocaleDateString()}</p>
    </li>
  );
}

function scrollDashboardMain(el) {
  const main = el?.closest("main");
  if (!main || !el) return;
  const top = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop;
  main.scrollTo({ top: Math.max(0, top - 8), behavior: "smooth" });
}

export default function RequestForm({ user }) {
  const [formData, setFormData] = useState({
    type: "maintenance",
    subject: "",
    description: "",
  });
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [mine, setMine] = useState([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const ticketsRef = useRef(null);

  const loadMine = async () => {
    try {
      const res = await apiFetch("/api/requests/mine");
      const data = await res.json().catch(() => []);
      setMine(Array.isArray(data) ? data : []);
    } catch {
      setMine([]);
    } finally {
      setLoadingMine(false);
    }
  };

  useEffect(() => {
    loadMine();
  }, []);

  const postReply = async (requestId, body) => {
    const res = await apiFetch(`/api/requests/${requestId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Couldn't post that note.");
    }
    setMine((current) =>
      current.map((req) =>
        req.id === requestId ? { ...req, comments: [...(req.comments || []), data] } : req,
      ),
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setError("");
    const submitBtn = e.currentTarget.querySelector("[type='submit']");

    try {
      const response = await apiFetch("/api/requests", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          first_name: user?.first_name || "Guest",
          last_name: user?.last_name || "Resident",
          resident_id: user?.id || null,
        }),
      });

      if (response.ok) {
        setStatus("success");
        setFormData({ type: "maintenance", subject: "", description: "" });
        submitBtn?.blur();
        await loadMine();
        requestAnimationFrame(() => scrollDashboardMain(ticketsRef.current));
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Could not submit that request.");
        setStatus("error");
      }
    } catch (err) {
      console.error("Network or Fetch Error:", err);
      setError("Network error submitting the request.");
      setStatus("error");
    }
  };

  const activeTickets = sortTickets(mine.filter((req) => req.status !== "Resolved"));
  const resolvedTickets = sortTickets(mine.filter((req) => req.status === "Resolved"));

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.kicker}>Neighborhood</p>
        <h2>Requests</h2>
        <p>
          Use this for something the HOA can act on: a common-area repair, or a change to your house the board needs to review. Emergencies, city code, and utilities are not tickets.
        </p>
      </header>

      <section className={styles.card} ref={ticketsRef}>
        <div className={styles.ticketHead}>
          <h3>Your tickets</h3>
          {resolvedTickets.length > 0 && (
            <button
              type="button"
              className={styles.resolvedToggle}
              onClick={() => setShowResolved((open) => !open)}
            >
              {showResolved ? "Hide resolved" : `${resolvedTickets.length} resolved`}
            </button>
          )}
        </div>
        {loadingMine ? (
          <p className={styles.empty}>Loading…</p>
        ) : mine.length === 0 ? (
          <p className={styles.empty}>Nothing submitted yet.</p>
        ) : (
          <>
            {activeTickets.length === 0 && (
              <p className={styles.empty}>Nothing open right now.</p>
            )}
            {activeTickets.length > 0 && (
              <ul className={styles.list}>
                {activeTickets.map((req) => (
                  <TicketItem key={req.id} req={req} onReply={postReply} />
                ))}
              </ul>
            )}
            {showResolved && resolvedTickets.length > 0 && (
              <ul className={styles.list}>
                {resolvedTickets.map((req) => (
                  <TicketItem key={req.id} req={req} onReply={postReply} />
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section className={styles.card}>
        <h3>Submit a request</h3>
        {status === "success" && <p className={styles.ok}>Submitted. It is on your list above and with the board.</p>}
        {status === "error" && <p className={styles.err}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.types}>
            {REQUEST_TYPES.map((item) => (
              <label key={item.value} className={`${styles.typeChoice} ${formData.type === item.value ? styles.typeOn : ""}`}>
                <input
                  type="radio"
                  name="request-type"
                  value={item.value}
                  checked={formData.type === item.value}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                />
                <strong>{item.label}</strong>
                <span>{item.hint}</span>
              </label>
            ))}
          </div>

          <label className={styles.field}>
            Subject
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Short title"
              required
            />
          </label>

          <label className={styles.field}>
            Details
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What needs attention, and where."
              required
            />
          </label>

          <Button type="submit">Submit request</Button>
        </form>
      </section>

      <CivicGuide />
    </div>
  );
}
