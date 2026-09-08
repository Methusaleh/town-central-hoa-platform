import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Button from "../../ui/Button";
import VendorCard from "../../VendorDirectory/VendorCard";
import { apiFetch } from "../../../api";
import styles from "./VendorControls.module.css";

const EMPTY_FORM = {
  company_name: "",
  service_type: "",
  contact_phone: "",
  contact_email: "",
  website_url: "",
  notes: "",
};

export default function VendorControls({ onBack }) {
  const [vendors, setVendors] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  const loadVendors = async () => {
    try {
      const res = await apiFetch("/api/vendors");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVendors([]);
        setError(data.error || "Could not load companies.");
        return;
      }
      setVendors(Array.isArray(data) ? data : []);
      setError("");
    } catch {
      setVendors([]);
      setError("Network error loading companies.");
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setStatus({ type: "", text: "" });
  };

  const startEdit = (vendor) => {
    setEditingId(vendor.id);
    setForm({
      company_name: vendor.company_name || "",
      service_type: vendor.service_type || "",
      contact_phone: vendor.contact_phone || "",
      contact_email: vendor.contact_email || "",
      website_url: vendor.website_url || "",
      notes: vendor.notes || "",
    });
    setShowForm(true);
    setStatus({ type: "", text: "" });
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setStatus({ type: "", text: "" });
    try {
      const path = editingId ? `/api/vendors/${editingId}` : "/api/vendors";
      const res = await apiFetch(path, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ type: "err", text: data.error || "Could not save that company." });
        return;
      }
      closeForm();
      setStatus({
        type: "ok",
        text: editingId ? "Updated. Neighbors will see the new details." : "Added to Trusted Companies.",
      });
      await loadVendors();
    } catch {
      setStatus({ type: "err", text: "Network error saving that company." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vendor) => {
    if (!window.confirm(`Remove ${vendor.company_name} from Trusted Companies?`)) return;
    try {
      const res = await apiFetch(`/api/vendors/${vendor.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ type: "err", text: data.error || "Could not remove that company." });
        return;
      }
      if (editingId === vendor.id) closeForm();
      setStatus({ type: "ok", text: `${vendor.company_name} is no longer listed.` });
      await loadVendors();
    } catch {
      setStatus({ type: "err", text: "Network error removing that company." });
    }
  };

  const updateField = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }));

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowLeft size={16} />
        Admin tools
      </button>

      <header className={styles.intro}>
        <div>
          <p className={styles.kicker}>Board</p>
          <h2>Vendor controls</h2>
          <p>
            These companies show under Trusted Companies for every household. Add a name and
            trade, then phone, email, or a website if you have them.
          </p>
        </div>
        {!showForm && (
          <Button onClick={startAdd}>Add a company</Button>
        )}
      </header>

      {status.text && (
        <p className={status.type === "err" ? styles.err : styles.ok}>{status.text}</p>
      )}

      {showForm && (
        <form ref={formRef} className={styles.formCard} onSubmit={handleSubmit}>
          <h3>{editingId ? "Edit company" : "Add a company"}</h3>
          <div className={styles.formRow}>
            <label>
              Company
              <input
                value={form.company_name}
                onChange={updateField("company_name")}
                placeholder="e.g. Piedmont Fence Co."
                required
              />
            </label>
            <label>
              Trade
              <input
                value={form.service_type}
                onChange={updateField("service_type")}
                placeholder="e.g. Fencing"
                required
              />
            </label>
          </div>
          <div className={styles.formRow}>
            <label>
              Phone
              <input
                type="tel"
                value={form.contact_phone}
                onChange={updateField("contact_phone")}
                placeholder="405-555-0198"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.contact_email}
                onChange={updateField("contact_email")}
                placeholder="jobs@example.com"
              />
            </label>
          </div>
          <label>
            Website
            <input
              type="text"
              inputMode="url"
              value={form.website_url}
              onChange={updateField("website_url")}
              placeholder="piedmontfence.example"
            />
          </label>
          <label>
            Note for neighbors
            <textarea
              value={form.notes}
              onChange={updateField("notes")}
              placeholder="e.g. Knows the HOA stain spec."
            />
          </label>
          <div className={styles.formActions}>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Add to directory"}
            </Button>
            <Button type="button" variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {!loaded ? (
        <p className={styles.empty}>Loading companies…</p>
      ) : error ? (
        <p className={styles.empty}>{error}</p>
      ) : vendors.length === 0 ? (
        <p className={styles.empty}>No companies listed. Add one to show it under Trusted Companies.</p>
      ) : (
        <div className={styles.grid}>
          {vendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              active={editingId === vendor.id}
              actions={
                <>
                  <Button variant="secondary" onClick={() => startEdit(vendor)}>
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => handleDelete(vendor)}>
                    Remove
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
