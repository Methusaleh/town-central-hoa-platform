import { useState } from "react";
import styles from "./Login.module.css";

export default function Login({ onBack, onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`${API_URL}/api/residents/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();

      if (res.ok) {
        onLoginSuccess(data.user);
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
      <button className={styles.backBtn} onClick={onBack}>← Back to Home</button>
      
      <div className={styles.card}>
        <h2>Resident Portal Login</h2>
        <p>Enter your official account credentials to access your dashboard.</p>

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
      </div>
    </div>
  );
}