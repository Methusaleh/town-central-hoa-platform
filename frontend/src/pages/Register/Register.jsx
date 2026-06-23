import { useState } from "react";
import { signInWithGoogle, registerWithEmail } from "../../firebase";
import styles from "./Register.module.css";

export default function Register({ onBack, onRegisterSuccess }) {
  const [step, setStep] = useState(1); 
  const [address, setAddress] = useState("");
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [residentData, setResidentData] = useState(null);
  const [error, setError] = useState(null);
  const [searching, setSearching] = useState(false);

  // New States for Custom Email/Password Flow
  const [authMethod, setAuthMethod] = useState("google"); // "google" or "email"
  const [customEmail, setCustomEmail] = useState("");
  const [customPassword, setCustomPassword] = useState("");

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
        setStep(2); 
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

  const handleSocialRegister = async () => {
    try {
      setSearching(true);
      setError(null);
      const googleUser = await signInWithGoogle();
      
      alert(`Successfully linked account for: ${googleUser.displayName}`);
      
      onRegisterSuccess({
        first_name: googleUser.displayName ? googleUser.displayName.split(" ")[0] : "Resident",
        email: googleUser.email,
        photo: googleUser.photoURL,
        role: "resident"
      });
    } catch (err) {
      setError("Failed to complete social verification. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleTraditionalRegister = async (e) => {
    e.preventDefault();
    if (!guidelinesAccepted) {
      setError("You must accept the community guidelines to proceed.");
      return;
    }
    
    try {
      setSearching(true);
      setError(null);
      const traditionalUser = await registerWithEmail(customEmail, customPassword);
      
      alert("Account created successfully with email!");
      
      onRegisterSuccess({
        first_name: residentData?.firstName || "Resident",
        email: traditionalUser.email,
        photo: null, // No avatar image for traditional email signups
        role: "resident"
      });
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email address is already registered inside Firebase.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters long.");
      } else {
        setError("Account creation failed. Please check your credentials.");
      }
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
              <p>To ensure a safe environment, you must agree to the baseline terms:</p>
              <ul>
                <li><strong>Professional Interactions:</strong> Keep all posts neighborly and constructive.</li>
                <li><strong>On-Topic Communication:</strong> Use this portal strictly for HOA business.</li>
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

            {error && <p className={styles.errorMsg}>❌ {error}</p>}

            {/* Toggle tabs for Method Selection */}
            <div className={styles.methodToggle}>
              <button 
                className={`${styles.toggleTab} ${authMethod === "google" ? styles.activeTab : ""}`}
                onClick={() => { setError(null); setAuthMethod("google"); }}
              >
                Google Account
              </button>
              <button 
                className={`${styles.toggleTab} ${authMethod === "email" ? styles.activeTab : ""}`}
                onClick={() => { setError(null); setAuthMethod("email"); }}
              >
                Email / Password
              </button>
            </div>

            {/* Render Selected Method View */}
            {authMethod === "google" ? (
              <button 
                className={styles.submitBtn} 
                disabled={!guidelinesAccepted || searching}
                onClick={handleSocialRegister}
              >
                {searching ? "Verifying Identity..." : "Link Google Account & Enter Portal"}
              </button>
            ) : (
              <form onSubmit={handleTraditionalRegister} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label>Preferred Email</label>
                  <input 
                    type="email" 
                    placeholder="resident@example.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Create Password</label>
                  <input 
                    type="password" 
                    placeholder="Min 6 characters"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className={styles.submitBtn} 
                  disabled={!guidelinesAccepted || searching}
                >
                  {searching ? "Creating Account..." : "Create Account & Enter Portal"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}