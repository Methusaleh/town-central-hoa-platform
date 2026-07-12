import { useState } from "react";
import styles from "../BoardPortal.module.css";

export default function FinancialLedger({ 
  masterRoster = [], // Default to empty array for safety
  financeForm = {},  // Default to empty object for safety
  setFinanceForm, 
  financeStatus = {}, // Default to empty object for safety
  handleUpdateFinanceLedger,
  onBack 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const autocompleteSuggestions = masterRoster.filter(r => {
    const query = searchQuery.toLowerCase();
    return (
      r.first_name.toLowerCase().includes(query) ||
      r.last_name.toLowerCase().includes(query) ||
      r.street_address.toLowerCase().includes(query)
    );
  });

  return (
    <div className={styles.tableCard} style={{ marginTop: "10px" }}>
      <div style={{ marginBottom: "20px" }}>
        <button className={styles.cancelBtn} onClick={onBack}>
          ← Back to Mission Control
        </button>
      </div>

      <div className={styles.tableHeader}>
        <div>
          <h3 style={{ margin: 0 }}>Resident Assessment Ledger</h3>
          <p style={{ margin: "5px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            Type any name or street segment to fetch the underlying ledger record row.
          </p>
        </div>
      </div>

      <div className={styles.formCard} style={{ border: "1px solid #e2e8f0", maxWidth: "600px" }}>
        <h4>Update Ledger Statement</h4>
        {financeStatus?.text && (
          <div style={{ 
            padding: "10px", 
            borderRadius: "6px", 
            marginBottom: "15px", 
            backgroundColor: financeStatus?.type === "success" ? "#d4edda" : "#f8d7da", 
            color: financeStatus?.type === "success" ? "#155724" : "#721c24" 
          }}>
            {financeStatus.text}
          </div>
        )}
        <form onSubmit={(e) => {
          handleUpdateFinanceLedger(e);
          setSearchQuery("");
        }} className={styles.announcementForm}>
          
          <div style={{ position: "relative" }}>
            <label>Search Resident Name or Street Address *</label>
            <input 
              type="text" 
              placeholder="Type Aaron, Becky, Thomas, 1559, etc..." 
              value={searchQuery} 
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
              required={!financeForm?.street_address} 
              autoComplete="off"
            />
            
            {showSuggestions && searchQuery && autocompleteSuggestions.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 1000, maxHeight: "180px", overflowY: "auto", marginTop: "4px" }}>
                {autocompleteSuggestions.map((lot) => (
                  <div
                    key={lot.id}
                    onMouseDown={() => {
                      setFinanceForm({ ...financeForm, street_address: lot.street_address });
                      setSearchQuery(`${lot.first_name} ${lot.last_name} (${lot.street_address})`);
                      setShowSuggestions(false);
                    }}
                    style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: "0.9rem" }}
                  >
                    👤 <strong>{lot.first_name} {lot.last_name}</strong> — 📍 {lot.street_address}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.inlineGroup} style={{ alignItems: "flex-end" }}>
            <div>
              <label>Outstanding Assessment Balance ($) *</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                value={financeForm?.balance || ""} 
                onChange={(e) => setFinanceForm({...financeForm, balance: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label>Payment Status Assignment</label>
              <select 
                value={financeForm?.status || "Pending"} 
                onChange={(e) => setFinanceForm({...financeForm, status: e.target.value})} 
                className={styles.prioritySelect}
              >
                <option value="Pending">Pending / Unpaid</option>
                <option value="Partial">Partial Payment</option>
                <option value="Paid">Paid in Full</option>
              </select>
            </div>
          </div>
          <button type="submit" className={styles.submitBtn} style={{ backgroundColor: "#3498db" }}>
            Commit Ledger Overwrite
          </button>
        </form>
      </div>
    </div>
  );
}