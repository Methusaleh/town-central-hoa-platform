import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Button from "../../ui/Button";
import { requestTypeLabel, ticketStatusLabel } from "../../../utils/requestTypes";
import styles from "./OperationsDashboard.module.css";

const TABS = [
  { id: "open", label: "Open", match: (s) => s === "Open" },
  { id: "review", label: "In review", match: (s) => s === "In review" },
  { id: "resolved", label: "Resolved", match: (s) => s === "Resolved" },
];

export default function OperationsDashboard({
  requests,
  loading,
  viewMode,
  setViewMode,
  handleResolve,
  handleReview,
  onBack,
}) {
  const [notes, setNotes] = useState({});
  const tab = TABS.find((item) => item.id === viewMode) || TABS[0];
  const filteredRequests = requests.filter((req) => tab.match(req.status));

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowLeft size={16} />
        Admin tools
      </button>

      <div className={styles.intro}>
        <div>
          <p className={styles.kicker}>Board</p>
          <h2>Operations & tickets</h2>
          <p>
            Neighbors submit these from Requests. Open means it just arrived. In review means someone on the board is looking. Resolve when the work or the decision is done.
          </p>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.tab} ${viewMode === item.id ? styles.tabOn : ""}`}
            onClick={() => setViewMode(item.id)}
          >
            {item.label}
            <em>{requests.filter((req) => item.match(req.status)).length}</em>
          </button>
        ))}
      </div>

      {loading ? (
        <p className={styles.empty}>Loading requests…</p>
      ) : filteredRequests.length === 0 ? (
        <p className={styles.empty}>Nothing in {tab.label.toLowerCase()}.</p>
      ) : (
        <ul className={styles.list}>
          {filteredRequests.map((req) => (
            <li key={req.id} className={styles.card}>
              <div className={styles.cardTop}>
                <p className={styles.meta}>
                  {new Date(req.created_at).toLocaleDateString()} · {req.first_name} {req.last_name}
                </p>
                <span className={styles.type}>{requestTypeLabel(req.request_type)}</span>
              </div>
              <h3>{req.subject}</h3>
              <p className={styles.desc}>{req.description || "No description provided."}</p>
              {req.board_note && <p className={styles.note}>Board note: {req.board_note}</p>}
              <p className={styles.statusLine}>{ticketStatusLabel(req.status)}</p>

              {req.status !== "Resolved" ? (
                <div className={styles.actions}>
                  <textarea
                    className={styles.noteField}
                    placeholder="Optional note the neighbor can see"
                    value={notes[req.id] || ""}
                    onChange={(e) => setNotes((current) => ({ ...current, [req.id]: e.target.value }))}
                  />
                  <div className={styles.actionRow}>
                    {req.status === "Open" && (
                      <Button variant="secondary" onClick={() => handleReview(req.id, notes[req.id])}>
                        Start review
                      </Button>
                    )}
                    <Button onClick={() => handleResolve(req.id, notes[req.id])}>Resolve</Button>
                  </div>
                </div>
              ) : (
                <p className={styles.resolved}>
                  Resolved by {req.resolved_by || "Admin"}
                  {req.resolved_at ? ` on ${new Date(req.resolved_at).toLocaleDateString()}` : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
