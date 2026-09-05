import { useState } from "react";
import styles from "../BoardPortal.module.css";
import { apiFetch } from "../../../api";

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
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterQuery, setFilterQuery] = useState("");
  
  // Email Composer Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");

  const filteredRoster = masterRoster.filter(res => 
    `${res.first_name} ${res.last_name} ${res.street_address} ${res.email}`.toLowerCase().includes(filterQuery.toLowerCase())
  );

  // Checkbox Selection Handlers
  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredRoster.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Auto-Check Filter Helpers
  const handleSelectByStatus = (statusType) => {
    if (statusType === "all") {
      setSelectedIds(masterRoster.map(r => r.id));
    } else if (statusType === "claimed") {
      setSelectedIds(masterRoster.filter(r => r.is_claimed).map(r => r.id));
    } else if (statusType === "unclaimed") {
      setSelectedIds(masterRoster.filter(r => !r.is_claimed).map(r => r.id));
    } else if (statusType === "clear") {
      setSelectedIds([]);
    }
  };

  const handleSendSelectedEmail = async (e) => {
    e.preventDefault();
    setSending(true);
    setEmailStatus("Sending emails...");

    // Map selected IDs to their actual email strings
    const selectedEmails = masterRoster
      .filter(r => selectedIds.includes(r.id) && r.email)
      .map(r => r.email);

    try {
      const res = await apiFetch("/api/residents/broadcast", {
        method: "POST",
        body: JSON.stringify({ 
          targetType: "selected", 
          selectedEmails, 
          subject, 
          message 
        })
      });

      const data = await res.json();
      if (res.ok) {
        setEmailStatus(`✅ Success! ${data.message}`);
        setSubject("");
        setMessage("");
        setTimeout(() => setShowEmailModal(false), 2000);
      } else {
        setEmailStatus(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setEmailStatus("❌ Network error connecting to email server.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.tableCard} style={{ marginTop: "10px" }}>
      <div style={{ marginBottom: "20px" }}>
        <button className={styles.cancelBtn} onClick={onBack}>← Back to Mission Control</button>
      </div>

      <div className={styles.tableHeader}>
        <div>
          <h3 style={{ margin: 0 }}>Master Roster & Mailing List</h3>
          <p style={{ margin: "5px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            Select rows using filters or checkboxes to email specific properties.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            className={styles.postBtn} 
            disabled={selectedIds.length === 0}
            onClick={() => setShowEmailModal(true)}
            style={{ background: selectedIds.length > 0 ? "#3b82f6" : "#cbd5e1" }}
          >
            📧 Email Selected ({selectedIds.length})
          </button>
          <button className={styles.postBtn} onClick={() => setShowRosterModal(!showRosterModal)}>
            {showRosterModal ? "Close Form" : "➕ Onboard Property"}
          </button>
        </div>
      </div>

      {/* FILTER & QUICK-SELECT BAR */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px", alignItems: "center", background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
        <input 
          type="text" 
          placeholder="🔍 Filter roster by name, address, email..." 
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
        />
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button onClick={() => handleSelectByStatus("all")} className={styles.viewBtn} style={{ fontSize: "0.75rem" }}>Select All</button>
          <button onClick={() => handleSelectByStatus("claimed")} className={styles.viewBtn} style={{ fontSize: "0.75rem" }}>Select Claimed</button>
          <button onClick={() => handleSelectByStatus("unclaimed")} className={styles.viewBtn} style={{ fontSize: "0.75rem" }}>Select Unclaimed</button>
          <button onClick={() => handleSelectByStatus("clear")} className={styles.viewBtn} style={{ fontSize: "0.75rem", color: "#ef4444" }}>Clear</button>
        </div>
      </div>

      {showRosterModal && (
        <div className={styles.formCard} style={{ marginBottom: "25px", border: "1px solid #e2e8f0" }}>
          <h4>Register New Neighborhood Lot Row</h4>
          {rosterStatus?.text && (
            <div style={{ padding: "10px", borderRadius: "6px", marginBottom: "15px", backgroundColor: rosterStatus?.type === "success" ? "#d4edda" : "#f8d7da", color: rosterStatus?.type === "success" ? "#155724" : "#721c24" }}>
              {rosterStatus.text}
            </div>
          )}
          <form onSubmit={(e) => handleOnboardResident(e, false)} className={styles.announcementForm}>
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

      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: "40px" }}>
              <input 
                type="checkbox" 
                onChange={handleToggleSelectAll}
                checked={filteredRoster.length > 0 && filteredRoster.every(r => selectedIds.includes(r.id))}
              />
            </th>
            <th>Resident Name</th>
            <th>Address</th>
            <th>Email</th>
            <th>Claim Code</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredRoster.map((res) => {
            const isChecked = selectedIds.includes(res.id);
            return (
              <tr key={res.id} style={{ background: isChecked ? "#f0fdf4" : "transparent" }}>
                <td>
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={() => handleToggleOne(res.id)}
                  />
                </td>
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
            );
          })}
        </tbody>
      </table>

      {/* EMAIL COMPOSER MODAL */}
      {showEmailModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowEmailModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3>📧 Send Broadcast to Selected ({selectedIds.length})</h3>
            <form onSubmit={handleSendSelectedEmail} className={styles.announcementForm} style={{ marginTop: "15px" }}>
              <div>
                <label>Subject</label>
                <input 
                  type="text" 
                  placeholder="Subject line..." 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label>Message</label>
                <textarea 
                  placeholder="Type message to selected residents..." 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)} 
                  required 
                  style={{ minHeight: "120px" }}
                />
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="submit" className={styles.submitBtn} style={{ flex: 1 }} disabled={sending}>
                  {sending ? "Sending..." : "Dispatch Broadcast"}
                </button>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowEmailModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
            {emailStatus && <p style={{ marginTop: "12px", fontWeight: "600", fontSize: "0.9rem" }}>{emailStatus}</p>}
          </div>
        </div>
      )}
    </div>
  );
}