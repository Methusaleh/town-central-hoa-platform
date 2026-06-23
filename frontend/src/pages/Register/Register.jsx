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
      
      // 1. Persist the lock state to PostgreSQL database first
      const dbResponse = await fetch(`${API_URL}/api/residents/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ residentId: residentData?.residentId })
      });

      if (!dbResponse.ok) {
        throw new Error("Failed to secure property profile on neighborhood database roster.");
      }

      alert(`Successfully linked account for: ${googleUser.displayName}`);
      
      onRegisterSuccess({
        first_name: googleUser.displayName ? googleUser.displayName.split(" ")[0] : "Resident",
        email: googleUser.email,
        photo: googleUser.photoURL,
        role: "resident"
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to complete social verification. Please try again.");
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
      
      // 1. Authenticate with Firebase Auth engine
      const traditionalUser = await registerWithEmail(customEmail, customPassword);
      
      // 2. Persist the lock state to PostgreSQL database right after
      const dbResponse = await fetch(`${API_URL}/api/residents/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ residentId: residentData?.residentId })
      });

      if (!dbResponse.ok) {
        throw new Error("Auth created, but failed to lock property profile on neighborhood roster.");
      }

      alert("Account created successfully with email!");
      
      onRegisterSuccess({
        first_name: residentData?.firstName || "Resident",
        email: traditionalUser.email,
        photo: null, 
        role: "resident"
      });
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email address is already registered inside Firebase.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters long.");
      } else {
        setError(err.message || "Account creation failed. Please check your credentials.");
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
                className={styles.googleBtn} // <-- Swapped class name here
                disabled={!guidelinesAccepted || searching}
                onClick={handleSocialRegister}
              >
                {searching ? (
                  "Verifying Identity..."
                ) : (
                  <>
                    <svg className={styles.googleIcon} viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
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