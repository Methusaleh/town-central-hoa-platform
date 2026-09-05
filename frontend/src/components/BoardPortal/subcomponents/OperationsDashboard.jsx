import styles from "../BoardPortal.module.css";

export default function OperationsDashboard({ 
  requests, 
  loading, 
  viewMode, 
  onToggleView,
  handleResolve,
  onBack 
}) {
  const filteredRequests = requests.filter((req) =>
    viewMode === "active" ? req.status === "Open" : req.status === "Resolved"
  );

  return (
    <>
      <div style={{ marginBottom: "20px" }}>
        <button className={styles.cancelBtn} onClick={onBack}>
          ← Admin tools
        </button>
      </div>

      <header className={styles.header} style={{ marginTop: "10px" }}>
        <h2>Executive Operations & Tickets Dashboard</h2>
      </header>

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h3>{viewMode === "active" ? "Active Resident Requests" : "Resolved Archive"}</h3>
          <button className={styles.toggleBtn} onClick={onToggleView}>
            {viewMode === "active" ? "View Archive" : "Back to Active"}
          </button>
        </div>
        {loading ? <p>Loading requests...</p> : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date Submitted</th>
                <th>Resident</th>
                <th>Subject / Description</th>
                <th>Type</th>
                <th>Status</th>
                {viewMode === "active" && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req.id}>
                  <td className={styles.dateCol}>{new Date(req.created_at).toLocaleDateString()}</td>
                  <td style={{ fontWeight: "600" }}>{req.first_name} {req.last_name}</td>
                  <td>
                    <div style={{ fontWeight: "700", color: "#0f172a" }}>{req.subject}</div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px", background: "#f8fafc", padding: "8px", borderRadius: "6px", borderLeft: "3px solid #cbd5e1" }}>
                      {req.description || "No text description details provided."}
                    </div>
                  </td>
                  <td><span className={styles.typeTag}>{req.request_type}</span></td>
                  <td><span className={`${styles.statusBadge} ${styles.statusOpen}`}>{req.status}</span></td>
                  {viewMode === "active" ? (
                    <td><button className={styles.viewBtn} onClick={() => handleResolve(req.id)}>Resolve & Archive</button></td>
                  ) : (
                    <td className={styles.resolvedInfo}>By {req.resolved_by || "Admin"} on {req.resolved_at ? new Date(req.resolved_at).toLocaleDateString() : "N/A"}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}