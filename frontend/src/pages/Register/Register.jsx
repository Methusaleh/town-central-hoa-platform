import { useState } from "react";
import styles from "./Register.module.css";

export default function Register({ onBack, onRegisterSuccess }) {
  const [step, setStep] = useState(1); 
  const [address, setAddress] = useState("");
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [residentData, setResidentData] = useState(null);
  const [error, setError] = useState(null);
  const [searching, setSearching] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  const handleAddressSearch = async (e) => {
    e.preventDefault();
    setError(null);
    setSearching(true);

    try {
      const response = await fetch(`${API_URL}/api/residents/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address })
      });

      const data = await response.json();

      if (response.ok) {
        setResidentData(data);
        setStep(2); // Push to guidelines agreement step
      } else {
        setError(data.error || "An error occurred during lookup.");
      }
    } catch (err) {
      console.error("Lookup error:", err);
      setError("Network error: Could not reach server.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <button onClick={onBack} className={styles.backBtn}>← Back to Home</button>
        <span className={styles.logo}>Town Central HOA</span>
      </nav>

      <div className={styles.cardWrapper}>
        {step === 1 && (
          <div className={styles.card}>
            <h3>Claim Your Resident Profile</h3>
            <p className={styles.subtext}>
              Enter your street address below. If your property is on the neighborhood master log, we'll automatically set up your portal account.
            </p>
            {error && <p className={styles.errorMsg}>❌ {error}</p>}
            <form onSubmit={handleAddressSearch} className={styles.form}>
              <div className={styles.inputGroup}>
                <label>Street Address</label>
                <input 
                  type="text" 
                  placeholder="e.g., 123 Town Central Dr" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required 
                />
              </div>
              <button type="submit" className={styles.submitBtn} disabled={searching}>
                {searching ? "Searching Log..." : "Search Database"}
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className={styles.card}>
            <div className={styles.successBanner}>✅ Profile Located!</div>
            <h3>Welcome, {residentData?.firstName}!</h3>
            <p className={styles.addressDisplay}>Property: <strong>{residentData?.matchedAddress}</strong></p>
            
            <div className={styles.guidelinesBox}>
              <h4>📋 Platform Community Guidelines</h4>
              <p>To ensure a safe, professional, and constructive environment for all Town Central residents, you must agree to the following baseline terms:</p>
              <ul>
                <li><strong>Professional Interactions:</strong> Keep all discussions, complaints, and comments polite, neighborly, and constructive.</li>
                <li><strong>On-Topic Communication:</strong> Use this portal strictly for HOA business, maintenance filings, safety alerts, and community-wide events.</li>
                <li><strong>No Public Rants:</strong> System administrators reserve the right to immediately remove any off-topic, hostile, or harassing content post-publication.</li>
              </ul>
            </div>

            <label className={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                checked={guidelinesAccepted}
                onChange={(e) => setGuidelinesAccepted(e.target.checked)}
              />
              <span>I agree to keep my posts professional and abide by the community guidelines.</span>
            </label>

            <button 
              className={styles.submitBtn} 
              disabled={!guidelinesAccepted}
              onClick={onRegisterSuccess}
            >
              Complete Registration & Enter Portal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}