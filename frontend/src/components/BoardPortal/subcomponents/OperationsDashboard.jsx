import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Button from "../../ui/Button";
import TicketThread from "../../TicketThread/TicketThread";
import { apiFetch } from "../../../api";
import { requestTypeLabel, ticketStatusLabel, isBoardNote, isArchivedTicket } from "../../../utils/requestTypes";
import styles from "./OperationsDashboard.module.css";

const TABS = [
  { id: "open", label: "Open" },
  { id: "review", label: "In review" },
  { id: "resolved", label: "Resolved" },
  { id: "archive", label: "Archive" },
];

function matchesTab(tabId, request) {
  const archived = isArchivedTicket(request);
  if (tabId === "open") return request.status === "Open";
  if (tabId === "review") return request.status === "In review";
  if (tabId === "resolved") return request.status === "Resolved" && !archived;
  if (tabId === "archive") return archived;
  return false;
}

const EMPTY_LOG = { street_address: "", neighbor_name: "", subject: "", description: "" };

export default function OperationsDashboard({
  requests,
  loading,
  viewMode,
  setViewMode,
  handleResolve,
  handleReview,
  handleComment,
  handleLogInteraction,
  onBack,
}) {
  const [lots, setLots] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [log, setLog] = useState(EMPTY_LOG);
  const [logStatus, setLogStatus] = useState({ type: "", text: "" });
  const [logSending, setLogSending] = useState(false);
  const [exportStatus, setExportStatus] = useState({ type: "", text: "" });
  const [exporting, setExporting] = useState(false);

  const tab = TABS.find((item) => item.id === viewMode) || TABS[0];
  const filteredRequests = requests.filter((req) => matchesTab(tab.id, req));

  useEffect(() => {
    apiFetch("/api/residents/master-list-placeholder")
      .then((res) => res.json())
      .then((data) => setLots(Array.isArray(data) ? data : []))
      .catch(() => setLots([]));
  }, []);

  const submitLog = async (e) => {
    e.preventDefault();
    if (!handleLogInteraction || logSending) return;
    setLogSending(true);
    setLogStatus({ type: "", text: "" });
    try {
      await handleLogInteraction(log);
      setLog(EMPTY_LOG);
      setShowLog(false);
      setLogStatus({ type: "ok", text: "Saved for the board. The neighbor does not see this." });
    } catch (err) {
      setLogStatus({ type: "err", text: err.message || "Couldn't save that." });
    } finally {
      setLogSending(false);
    }
  };

  const fileArchive = async () => {
    if (exporting) return;
    setExporting(true);
    setExportStatus({ type: "", text: "" });
    try {
      const res = await apiFetch("/api/requests/admin/archive-export", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setExportStatus({ type: "ok", text: data.message || "Filed to Board documents." });
      } else {
        setExportStatus({ type: "err", text: data.error || "Couldn't file that archive." });
      }
    } catch {
      setExportStatus({ type: "err", text: "Network error filing the archive." });
    } finally {
      setExporting(false);
    }
  };

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
            Neighbors file repairs and house changes from Requests. Log driveway conversations here so the rest of the board can see them — those notes stay board-only.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setShowLog((open) => !open)}>
          {showLog ? "Close log" : "Log an interaction"}
        </Button>
      </div>

      {showLog && (
        <form className={styles.logCard} onSubmit={submitLog}>
          <h3>Log an interaction</h3>
          <p>Stopped at the mailbox, a call, a hallway complaint — anything the board should remember.</p>
          <label>
            Street
            <select
              value={log.street_address}
              onChange={(e) => setLog((current) => ({ ...current, street_address: e.target.value }))}
            >
              <option value="">Not tied to a lot</option>
              {lots.map((lot) => (
                <option key={lot.id} value={lot.street_address}>
                  {lot.street_address}
                </option>
              ))}
            </select>
          </label>
          <label>
            Who you talked to
            <input
              value={log.neighbor_name}
              onChange={(e) => setLog((current) => ({ ...current, neighbor_name: e.target.value }))}
              placeholder="Name if you have it"
            />
          </label>
          <label>
            Subject
            <input
              value={log.subject}
              onChange={(e) => setLog((current) => ({ ...current, subject: e.target.value }))}
              placeholder="Pond, fence, dues…"
              required
            />
          </label>
          <label>
            What was said
            <textarea
              rows="3"
              value={log.description}
              onChange={(e) => setLog((current) => ({ ...current, description: e.target.value }))}
              required
            />
          </label>
          {logStatus.text && (
            <p className={logStatus.type === "err" ? styles.err : styles.ok}>{logStatus.text}</p>
          )}
          <Button type="submit" disabled={logSending || !log.subject.trim() || !log.description.trim()}>
            {logSending ? "Saving…" : "Save for the board"}
          </Button>
        </form>
      )}

      <div className={styles.tabs}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.tab} ${viewMode === item.id ? styles.tabOn : ""}`}
            onClick={() => setViewMode(item.id)}
          >
            {item.label}
            <em>{requests.filter((req) => matchesTab(item.id, req)).length}</em>
          </button>
        ))}
      </div>

      {tab.id === "archive" && (
        <div className={styles.archiveBar}>
          <p>Resolved more than 24 months ago. The working list stays short; this is the long memory.</p>
          <Button variant="secondary" onClick={fileArchive} disabled={exporting}>
            {exporting ? "Filing…" : "Save archive to Board docs"}
          </Button>
          {exportStatus.text && (
            <p className={exportStatus.type === "err" ? styles.err : styles.ok}>{exportStatus.text}</p>
          )}
        </div>
      )}

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
                  {[
                    new Date(req.created_at).toLocaleDateString(),
                    req.street_address,
                    `${req.first_name || ""} ${req.last_name || ""}`.trim(),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <span className={isBoardNote(req) ? styles.typeBoard : styles.type}>
                  {requestTypeLabel(req.request_type)}
                </span>
              </div>
              <h3>{req.subject}</h3>
              <p className={styles.desc}>{req.description || "No description provided."}</p>
              {!(req.comments || []).length && req.board_note && (
                <p className={styles.note}>Board note: {req.board_note}</p>
              )}
              <p className={styles.statusLine}>{ticketStatusLabel(req.status)}</p>

              {req.status === "Open" ? (
                <p className={styles.privateHint}>
                  {isBoardNote(req)
                    ? "Board only. Start review to add follow-up notes the neighbor will not see."
                    : "Start review to open the thread with this household."}
                </p>
              ) : (
                <TicketThread
                  comments={req.comments || []}
                  canReply={req.status === "In review"}
                  boardOnly={isBoardNote(req)}
                  placeholder={isBoardNote(req) ? "Board follow-up" : "Note the neighbor can see"}
                  onPost={(body) => handleComment(req.id, body)}
                />
              )}

              {req.status !== "Resolved" ? (
                <div className={styles.actionRow}>
                  {req.status === "Open" && (
                    <Button variant="secondary" onClick={() => handleReview(req.id)}>
                      Start review
                    </Button>
                  )}
                  <Button onClick={() => handleResolve(req.id)}>Resolve</Button>
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
