import { useState } from "react";
import BrandMark from "../../components/ui/BrandMark";
import PasswordField from "../../components/ui/PasswordField";
import styles from "./Claim.module.css";
import { apiFetch, persistSession } from "../../api";

export default function Claim({ onBack, onClaimSuccess }) {
  const [step, setStep] = useState(1);
  const [residentId, setResidentId] = useState(null);
  const [claimPayload, setClaimPayload] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [inviting, setInviting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState({
    street_address: "",
    onboarding_token: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });

  const goToHome = (payload = claimPayload) => {
    if (payload) onClaimSuccess(payload);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      const res = await apiFetch("/api/residents/verify", {
        method: "POST",
        body: JSON.stringify({
          street_address: formData.street_address,
          onboarding_token: formData.onboarding_token,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResidentId(data.residentId);
        setStep(2);
      } else {
        setErrorMsg(data.error || "Invalid address or claim code. Please double-check your welcome letter.");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setErrorMsg("Network error during verification.");
    }
  };

  const handleFinalize = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      const res = await apiFetch("/api/residents/claim", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          residentId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        persistSession({ token: data.token, user: data.user });
        setClaimPayload(data);
        setStep(3);
      } else {
        setErrorMsg(data.error || "There was an issue creating your account. Please try again.");
      }
    } catch (err) {
      console.error("Claim finalization error:", err);
      setErrorMsg("Network error. Please check your connection.");
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email || inviting) return;
    if (email === String(formData.email || "").trim().toLowerCase()) {
      setInviteStatus("Use a different email than the one you just signed up with.");
      return;
    }

    setInviting(true);
    setInviteStatus("");
    try {
      const res = await apiFetch("/api/residents/invite", {
        method: "POST",
        body: JSON.stringify({
          email,
          primary_resident_id: claimPayload?.user?.id,
          address: claimPayload?.user?.address || formData.street_address,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setInviteStatus(`Invite sent to ${email}. They’ll get their own login for this house.`);
        setInviteEmail("");
      } else {
        setInviteStatus(data.error || "Could not send that invite.");
      }
    } catch (err) {
      console.error("Invite error:", err);
      setInviteStatus("Network error sending the invite.");
    } finally {
      setInviting(false);
    }
  };

  const title =
    step === 1 ? "Verify your property" : step === 2 ? "Complete your profile" : "Anyone else at this address?";

  return (
    <div className={styles.claimContainer}>
      {step < 3 && (
        <button className={styles.backBtn} onClick={onBack}>Back to home</button>
      )}

      <div className={styles.formCard}>
        <div className={styles.brandRow}>
          <BrandMark size={28} />
          <span>Town Central</span>
        </div>
        <h2>{title}</h2>

        {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

        {step === 1 && (
          <form onSubmit={handleVerify}>
            <input
              type="text"
              placeholder="Street Address"
              onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="6-Digit Claim Code"
              onChange={(e) => setFormData({ ...formData, onboarding_token: e.target.value })}
              required
            />
            <button type="submit" className={styles.submitBtn}>Verify address</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleFinalize}>
            <input
              type="text"
              placeholder="First Name"
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email Address"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <PasswordField
              autoComplete="new-password"
              placeholder="Create a password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <button type="submit" className={styles.submitBtn}>Activate account</button>
          </form>
        )}

        {step === 3 && (
          <>
            <p className={styles.lead}>
              Your house is claimed. If a spouse, partner, or anyone else lives at{" "}
              <strong>{claimPayload?.user?.address || formData.street_address}</strong>,
              invite them now. They get their own login — they should not reuse yours.
            </p>
            <form onSubmit={handleInvite}>
              <input
                type="email"
                placeholder="Their email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
              <button type="submit" className={styles.submitBtn} disabled={inviting}>
                {inviting ? "Sending…" : "Send invite"}
              </button>
            </form>
            {inviteStatus && <p className={styles.status}>{inviteStatus}</p>}
            <p className={styles.hint}>You can also invite people later from your profile.</p>
            <button type="button" className={styles.skipBtn} onClick={() => goToHome()}>
              {inviteStatus.startsWith("Invite sent") ? "Continue to Town Central" : "Skip for now"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
