import { useState } from "react";
import styles from "./InviteMember.module.css";
import { apiFetch } from "../../api";

export default function InviteMember({ user }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  const handleInvite = async (e) => {
    e.preventDefault();
    setStatus("Sending...");
    
    try {
      const res = await apiFetch("/api/residents/invite", {
        method: "POST",
        body: JSON.stringify({ 
          email, 
          primary_resident_id: user.id,
          address: user.address 
        })
      });

      if (res.ok) {
        setStatus("✅ Invitation sent!");
        setEmail("");
      } else {
        setStatus("❌ Failed to send invite.");
      }
    } catch (err) {
      setStatus("❌ Network error.");
    }
  };

  return (
    <div className={styles.inviteContainer}>
      <h4>Invite Household Member</h4>
      <p>
        Invite a roommate or family member. They get their own login for The Porch, the same
        household access you have, and they are included on board email to this address.
      </p>
      <form onSubmit={handleInvite} className={styles.form}>
        <input 
          type="email" 
          placeholder="member@email.com" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <button type="submit" className={styles.btn}>Send Invite</button>
      </form>
      {status && <p className={styles.status}>{status}</p>}
    </div>
  );
}