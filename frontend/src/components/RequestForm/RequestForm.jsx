import { useEffect, useState } from "react";
import CivicGuide from "../CivicGuide/CivicGuide";
import Button from "../ui/Button";
import { apiFetch } from "../../api";
import { REQUEST_TYPES, requestTypeLabel, ticketStatusLabel } from "../../utils/requestTypes";
import styles from "./RequestForm.module.css";

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setError("");

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
        loadMine();
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

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.kicker}>Neighborhood</p>
        <h2>Requests</h2>
        <p>
          Use this for something the HOA can act on: a common-area repair, or a change to your house the board needs to review. Emergencies, city code, and utilities are not tickets.
        </p>
      </header>

      <CivicGuide />

      <section className={styles.card}>
        <h3>Your tickets</h3>
        {loadingMine ? (
          <p className={styles.empty}>Loading…</p>
        ) : mine.length === 0 ? (
          <p className={styles.empty}>Nothing submitted yet. A new request shows up here so you can see if the board is reviewing it.</p>
        ) : (
          <ul className={styles.list}>
            {mine.map((req) => (
              <li key={req.id} className={styles.ticket}>
                <div className={styles.ticketTop}>
                  <span className={styles.type}>{requestTypeLabel(req.request_type)}</span>
                  <span className={`${styles.status} ${styles[`st${(req.status || "Open").replace(/\s/g, "")}`]}`}>
                    {ticketStatusLabel(req.status)}
                  </span>
                </div>
                <strong>{req.subject}</strong>
                <p>{req.description}</p>
                {req.board_note && (
                  <p className={styles.note}>Board: {req.board_note}</p>
                )}
                <p className={styles.when}>{new Date(req.created_at).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
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
    </div>
  );
}
