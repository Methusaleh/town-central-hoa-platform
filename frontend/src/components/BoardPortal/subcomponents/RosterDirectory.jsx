import styles from "../BoardPortal.module.css";

export default function RosterDirectory({ 
  masterRoster, 
  showRosterModal, 
  setShowRosterModal, 
  rosterForm, 
  setRosterForm, 
  rosterStatus, 
  handleOnboardResident 
}) {
  return (
    <div className={styles.tableCard} style={{ marginTop: "10px" }}>
      <div className={styles.tableHeader}>
        <div>
          <h3 style={{ margin: 0 }}>Roster Security Directory</h3>
          <p style={{ margin: "5px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            Displaying all pre-seeded neighborhood properties and claimed user profiles.
          </p>
        </div>
        <button className={styles.postBtn} onClick={() => setShowRosterModal(!showRosterModal)}>
          {showRosterModal ? "Close Form" : "➕ Onboard Property"}
        </button>
      </div>

      {showRosterModal && (
        <div className={styles.formCard} style={{ marginBottom: "25px", border: "1px solid #e2e8f0" }}>
          <h4>Register New Neighborhood Lot Row</h4>
          {rosterStatus.text && (
            <div style={{ padding: "10px", borderRadius: "6px", marginBottom: "15px", backgroundColor: rosterStatus.type === "success" ? "#d4edda" : "#f8d7da", color: rosterStatus.type === "success" ? "#155724" : "#721c24" }}>
              {rosterStatus.text}
            </div>
          )}
          <form onSubmit={handleOnboardResident} className={styles.announcementForm}>
            <div className={styles.inlineGroup}>
              <div>
                <label>First Name *</label>
                <input 
                  type="text" 
                  value={rosterForm.first_name} 
                  onChange={(e) => setRosterForm({...rosterForm, first_name: e.target.value})} 
                  required 
                />
              </div>
              <div>
                <label>Last Name *</label>
                <input 
                  type="text" 
                  value={rosterForm.last_name} 
                  onChange={(e) => setRosterForm({...rosterForm, last_name: e.target.value})} 
                  required 
                />
              </div>
            </div>
            <div>
              <label>Preferred Contact Email</label>
              <input 
                type="email" 
                placeholder="Optional until user claims account" 
                value={rosterForm.email} 
                onChange={(e) => setRosterForm({...rosterForm, email: e.target.value})} 
              />
            </div>
            <div>
              <label>Street Address Assignment *</label>
              <input 
                type="text" 
                placeholder="e.g. 742 Evergreen Terrace" 
                value={rosterForm.street_address} 
                onChange={(e) => setRosterForm({...rosterForm, street_address: e.target.value})} 
                required 
              />
            </div>
            <button type="submit" className={styles.submitBtn}>Write Secure Roster Entry</button>
          </form>
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Lot ID</th>
            <th>Full Resident Name</th>
            <th>Assigned Street Address</th>
            <th>Email Registration Hook</th>
            <th>Portal Claim Status</th>
          </tr>
        </thead>
        <tbody>
          {masterRoster.map((res) => (
            <tr key={res.id}>
              <td style={{ fontWeight: "700", color: "#64748b" }}>{res.lot_number || `LOT-${100 + res.id}`}</td>
              <td style={{ fontWeight: "600" }}>{res.first_name} {res.last_name}</td>
              <td>📍 {res.street_address}</td>
              <td style={{ color: res.email ? "#0f172a" : "#94a3b8" }}>{res.email || "No email assigned"}</td>
              <td>
                <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", backgroundColor: res.is_claimed ? "#d1fae5" : "#f1f5f9", color: res.is_claimed ? "#065f46" : "#475569" }}>
                  {res.is_claimed ? "🔒 Claimed" : "⏳ Pending"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}