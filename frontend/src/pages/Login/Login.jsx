// frontend/src/pages/Login/Login.jsx
import { useState } from "react";
import styles from "./Login.module.css";
import { apiFetch } from "../../api";

export default function Login({ onBack, onLoginSuccess, onNavigateToClaim }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await apiFetch("/api/residents/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();

      if (res.ok) {
        onLoginSuccess(data);
      } else {
        setErrorMsg(data.error || "Invalid email or password.");
      }
    } catch (err) {
      console.error("Login network error:", err);
      setErrorMsg("Network error connecting to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={onBack}>Back to home</button>
      
      <div className={styles.card}>
        <h2>Sign in</h2>
        <p>Use your Town Central resident account.</p>

        {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="admin@towncentralhoa.org" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        {/* Subtext Prompt to Claim Profile */}
        <div className={styles.claimRow}>
          New to the portal?{" "}
          <button type="button" onClick={onNavigateToClaim}>
            Claim your profile
          </button>
        </div>
      </div>
    </div>
  );
}