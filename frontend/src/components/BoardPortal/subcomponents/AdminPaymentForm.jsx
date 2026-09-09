import { useEffect, useState } from "react";
import Button from "../../ui/Button";
import { apiFetch } from "../../../api";
import styles from "./AdminPaymentForm.module.css";

const EMPTY = {
  transaction_type: "payment",
  amount: "",
  payment_method: "check",
  reference_note: "",
};

function formatAmount(value) {
  const amount = Number(value);
  if (!amount || Number.isNaN(amount) || amount <= 0) return "";
  return amount.toFixed(2);
}

export default function AdminPaymentForm({ user, street_address, currentBalance = 0, onPaymentSuccess }) {
  const [formData, setFormData] = useState(EMPTY);
  const [displayAmount, setDisplayAmount] = useState("");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [sending, setSending] = useState(false);
  const remaining = formatAmount(currentBalance);

  useEffect(() => {
    const seed = formatAmount(currentBalance);
    setFormData({ ...EMPTY, amount: seed });
    setDisplayAmount(seed);
    setStatus({ type: "", text: "" });
  }, [street_address]);

  const handleAmountChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setDisplayAmount("");
      setFormData((current) => ({ ...current, amount: "" }));
      return;
    }
    const numericValue = (parseInt(rawValue, 10) / 100).toFixed(2);
    setDisplayAmount(numericValue);
    setFormData((current) => ({ ...current, amount: numericValue }));
  };

  const applyRemaining = () => {
    if (!remaining) return;
    setDisplayAmount(remaining);
    setFormData((current) => ({ ...current, transaction_type: "payment", amount: remaining }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || sending) return;
    setSending(true);
    setStatus({ type: "", text: "" });

    try {
      const res = await apiFetch("/api/dues/manual-payment", {
        method: "POST",
        body: JSON.stringify({
          street_address,
          ...formData,
          admin_name: user?.first_name || "Board Treasurer",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus({ type: "ok", text: `Posted. New balance ${formatMoney(data.new_balance)}.` });
        setFormData(EMPTY);
        setDisplayAmount("");
        if (onPaymentSuccess) onPaymentSuccess();
      } else {
        setStatus({ type: "err", text: data.error || "Could not post that entry." });
      }
    } catch {
      setStatus({ type: "err", text: "Network error posting to the ledger." });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.types}>
        <button
          type="button"
          className={formData.transaction_type === "payment" ? styles.typeOn : styles.typeBtn}
          onClick={() => setFormData((current) => ({ ...current, transaction_type: "payment" }))}
        >
          Record payment
        </button>
        <button
          type="button"
          className={formData.transaction_type === "charge" ? styles.typeOn : styles.typeBtn}
          onClick={() => setFormData((current) => ({ ...current, transaction_type: "charge" }))}
        >
          Post a charge
        </button>
      </div>

      <label>
        Amount
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={displayAmount}
          onChange={handleAmountChange}
          required
        />
      </label>
      {formData.transaction_type === "payment" && remaining && (
        <button type="button" className={styles.remaining} onClick={applyRemaining}>
          Apply remaining {formatMoney(currentBalance)}
        </button>
      )}

      {formData.transaction_type === "payment" && (
        <label>
          How it arrived
          <select
            value={formData.payment_method}
            onChange={(e) => setFormData((current) => ({ ...current, payment_method: e.target.value }))}
          >
            <option value="check">Paper check</option>
            <option value="ach">ACH / bill pay</option>
          </select>
        </label>
      )}

      <label>
        Memo
        <input
          type="text"
          placeholder={
            formData.transaction_type === "charge"
              ? "2026 assessment, special assessment…"
              : "Check 1042, bill-pay 9/5…"
          }
          value={formData.reference_note}
          onChange={(e) => setFormData((current) => ({ ...current, reference_note: e.target.value }))}
        />
      </label>

      <Button type="submit" disabled={sending || !formData.amount}>
        {sending
          ? "Posting…"
          : formData.transaction_type === "charge"
            ? "Post charge"
            : "Apply payment"}
      </Button>
      {status.text && (
        <p className={status.type === "err" ? styles.err : styles.ok}>{status.text}</p>
      )}
    </form>
  );
}

function formatMoney(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "$0.00";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
