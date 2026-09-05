import { useState } from "react";
import AdminPaymentForm from "./AdminPaymentForm";
import styles from "../BoardPortal.module.css";

export default function FinancialLedger({ 
  masterRoster = [], 
  onBack,
  user
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLot, setSelectedLot] = useState(null);

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
          <h3 style={{ margin: 0 }}>Financial Ledger Management</h3>
          <p style={{ margin: "5px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            Search for a resident to log a payment or view their account history.
          </p>
        </div>
      </div>

      {/* SEARCH INTERFACE */}
      <div className={styles.formCard} style={{ border: "1px solid #e2e8f0", maxWidth: "600px", marginBottom: "20px" }}>
        <div style={{ position: "relative" }}>
          <label>Find Resident Record</label>
          <input 
            type="text" 
            placeholder="Type name or address..." 
            value={searchQuery} 
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
          />
          
          {showSuggestions && searchQuery && autocompleteSuggestions.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 1000, maxHeight: "180px", overflowY: "auto", marginTop: "4px" }}>
              {autocompleteSuggestions.map((lot) => (
                <div
                  key={lot.id}
                  onMouseDown={() => {
                    setSelectedLot(lot);
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
      </div>

      {/* ACTIVE LEDGER VIEW */}
      {selectedLot && (
        <div className={styles.formCard} style={{ border: "1px solid #e2e8f0", maxWidth: "600px" }}>
          <AdminPaymentForm 
            user={user} 
            street_address={selectedLot.street_address}
            onPaymentSuccess={() => {
              alert("Payment applied successfully!");
              // In the future, call a refresh function here to re-fetch roster/dues data
            }}
          />
        </div>
      )}
    </div>
  );
}