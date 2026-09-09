import { useState } from "react";
import BrandMark from "../../components/ui/BrandMark";
import styles from "./Login.module.css";
import { apiFetch } from "../../api";

export default function ForgotPassword({ onBack, onNavigateToLogin }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await apiFetch("/api/residents/password/forgot", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setErrorMsg(data.error || "Could not send a reset email.");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
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
        <h2>Forgot password</h2>
        <p>
          Enter the email on your Town Central account. If it matches, we will send a reset link.
        </p>

        {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}
        {sent && (
          <div className={styles.successBanner}>
            If that email is on an account, we sent a reset link. Check your inbox and spam folder.
          </div>
        )}

        {!sent && (
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

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <div className={styles.claimRow}>
          Remembered it?{" "}
          <button type="button" onClick={onNavigateToLogin}>
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
