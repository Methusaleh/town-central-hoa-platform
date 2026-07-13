import { useState } from "react";
import styles from "../BoardPortal.module.css";

export default function RosterDirectory({ 
  masterRoster = [], 
  showRosterModal, 
  setShowRosterModal, 
  rosterForm = {}, 
  setRosterForm, 
  rosterStatus = {}, 
  handleOnboardResident,
  onBack 
}) {
  const [sendWelcomePacket, setSendWelcomePacket] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleOnboardResident(e, sendWelcomePacket);
    setSendWelcomePacket(false);
  };

  return (
    <div className={styles.tableCard} style={{ marginTop: "10px" }}>
      {/* Navigation Header */}
      <div style={{ marginBottom: "20px" }}>
        <button className={styles.cancelBtn} onClick={onBack}>
          ← Back to Mission Control
        </button>
      </div>

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
          {rosterStatus?.text && (
            <div style={{ padding: "10px", borderRadius: "6px", marginBottom: "15px", backgroundColor: rosterStatus?.type === "success" ? "#d4edda" : "#f8d7da", color: rosterStatus?.type === "success" ? "#155724" : "#721c24" }}>
              {rosterStatus.text}
            </div>
          )}
          <form onSubmit={handleSubmit} className={styles.announcementForm}>
            <div>
              <label>Street Address *</label>
              <input 
                type="text" 
                placeholder="e.g. 742 Evergreen Terrace" 
                value={rosterForm?.street_address || ""} 
                onChange={(e) => setRosterForm({...rosterForm, street_address: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label>Known Resident Email (Optional)</label>
              <input 
                type="email" 
                placeholder="Resident's email address" 
                value={rosterForm?.email || ""} 
                onChange={(e) => setRosterForm({...rosterForm, email: e.target.value})} 
              />
            </div>
            <button type="submit" className={styles.submitBtn}>Write Secure Roster Entry</button>
          </form>
        </div>
      )}

      {/* Table Updated: Lot ID removed, Email added */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Resident Name</th>
            <th>Address</th>
            <th>Email</th>
            <th>Claim Code</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {(masterRoster || []).map((res) => (
            <tr key={res.id}>
              <td style={{ fontWeight: "600" }}>{res.first_name} {res.last_name}</td>
              <td>📍 {res.street_address}</td>
              <td style={{ color: "#475569" }}>{res.email || "—"}</td>
              <td style={{ fontFamily: "monospace", fontWeight: "bold", color: "#3b82f6" }}>
                {res.onboarding_token || "—"}
              </td>
              <td>
                <span style={{ 
                  padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "700", 
                  textTransform: "uppercase", 
                  backgroundColor: res.is_claimed ? "#d1fae5" : "#f1f5f9", 
                  color: res.is_claimed ? "#065f46" : "#475569" 
                }}>
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