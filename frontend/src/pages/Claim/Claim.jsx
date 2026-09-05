import { useState } from "react";
import styles from "./Claim.module.css";
import { apiFetch } from "../../api";

export default function Claim({ onBack, onClaimSuccess }) {
  const [step, setStep] = useState(1);
  const [residentId, setResidentId] = useState(null);
  const [formData, setFormData] = useState({ 
    street_address: "", 
    onboarding_token: "", 
    email: "", 
    password: "", 
    first_name: "", 
    last_name: "" 
  });

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/residents/verify", {
        method: "POST",
        body: JSON.stringify({ 
          street_address: formData.street_address, 
          onboarding_token: formData.onboarding_token 
        })
      });

      const data = await res.json();

      if (res.ok) {
        setResidentId(data.residentId);
        setStep(2);
      } else {
        alert(data.error || "Invalid address or claim code. Please double-check your welcome letter.");
      }
    } catch (err) {
      console.error("Verification error:", err);
      alert("Network error during verification.");
    }
  };

  const handleFinalize = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/residents/claim", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          residentId
        })
      });

      const data = await res.json();

      if (res.ok) {
        onClaimSuccess(data);
      } else {
        alert(data.error || "There was an issue creating your account. Please try again.");
      }
    } catch (err) {
      console.error("Claim finalization error:", err);
      alert("Network error. Please check your connection.");
    }
  };

  return (
    <div className={styles.claimContainer}>
      <button className={styles.backBtn} onClick={onBack}>← Back</button>
      
      <div className={styles.formCard}>
        <h2>{step === 1 ? "Verify Your Property" : "Complete Your Profile"}</h2>
        
        {step === 1 ? (
          <form onSubmit={handleVerify}>
            <input type="text" placeholder="Street Address" onChange={(e) => setFormData({...formData, street_address: e.target.value})} required />
            <input type="text" placeholder="6-Digit Claim Code" onChange={(e) => setFormData({...formData, onboarding_token: e.target.value})} required />
            <button type="submit" className={styles.submitBtn}>Verify Address</button>
          </form>
        ) : (
          <form onSubmit={handleFinalize}>
            <input type="text" placeholder="First Name" onChange={(e) => setFormData({...formData, first_name: e.target.value})} required />
            <input type="text" placeholder="Last Name" onChange={(e) => setFormData({...formData, last_name: e.target.value})} required />
            <input type="email" placeholder="Email Address" onChange={(e) => setFormData({...formData, email: e.target.value})} required />
            <input type="password" placeholder="Create Secure Password" onChange={(e) => setFormData({...formData, password: e.target.value})} required />
            <button type="submit" className={styles.submitBtn}>Activate Account</button>
          </form>
        )}
      </div>
    </div>
  );
}