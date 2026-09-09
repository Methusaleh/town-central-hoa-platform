// frontend/src/pages/Login/Login.jsx
import { useState } from "react";
import BrandMark from "../../components/ui/BrandMark";
import PasswordField from "../../components/ui/PasswordField";
import styles from "./Login.module.css";
import { apiFetch } from "../../api";

export default function Login({ onBack, onLoginSuccess, onNavigateToClaim, onNavigateToForgot }) {
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
        <div className={styles.brandRow}>
          <BrandMark size={28} />
          <span>Town Central</span>
        </div>
        <h2>Sign in</h2>
        <p>Use your Town Central resident account.</p>

        {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="you@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Password</label>
            <PasswordField
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {onNavigateToForgot && (
              <button type="button" className={styles.forgotLink} onClick={onNavigateToForgot}>
                Forgot password?
              </button>
            )}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
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