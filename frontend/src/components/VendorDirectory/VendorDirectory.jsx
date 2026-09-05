import { useState, useEffect } from "react";
import styles from "./VendorDirectory.module.css";
import { apiFetch } from "../../api";

export default function VendorDirectory() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/vendors")
      .then((res) => res.json())
      .then((data) => {
        setVendors(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error pulling vendors:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading trusted vendor listings...</p>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h3>Verified Vendor Directory</h3>
        <p>A compilation of board-vetted local businesses and contractor services recommended by Town Central residents.</p>
      </header>

      <div className={styles.grid}>
        {vendors.map((vendor) => (
          <div key={vendor.id} className={styles.vendorCard}>
            <div className={styles.cardHeader}>
              <h4>{vendor.company_name}</h4>
              <span className={styles.tag}>{vendor.service_type}</span>
            </div>
            
            <div className={styles.contactDetails}>
              {vendor.contact_phone && <p>📞 {vendor.contact_phone}</p>}
              {vendor.contact_email && <p>✉️ <a href={`mailto:${vendor.contact_email}`}>{vendor.contact_email}</a></p>}
              {vendor.website_url && (
                <p>🌐 <a href={vendor.website_url} target="_blank" rel="noreferrer">Visit Website</a></p>
              )}
            </div>

            {vendor.notes && (
              <div className={styles.notesBox}>
                <strong>Board Note:</strong> {vendor.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}