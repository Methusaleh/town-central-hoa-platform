import styles from "../BoardPortal.module.css";

export default function VendorControls({
  showVendorForm,
  setShowVendorForm,
  editingVendorId,
  setEditingVendorId,
  vendorForm,
  setVendorForm,
  vendorsList,
  handleVendorSubmit,
  startEditVendor,
  handleDeleteVendor,
  onBack // Added prop for navigation
}) {
  return (
    <div className={styles.tableCard} style={{ marginTop: "10px" }}>
      {/* Navigation Header */}
      <div style={{ marginBottom: "20px" }}>
        <button className={styles.cancelBtn} onClick={onBack}>
          ← Back to Mission Control
        </button>
      </div>

      <div className={styles.tableHeader}>
        <div>
          <h3 style={{ margin: 0 }}>Trusted Companies Directory Control</h3>
          <p style={{ margin: "5px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            Add, modify, or remove contractor and business recommendation rows visible to homeowners.
          </p>
        </div>
        <button 
          className={showVendorForm ? styles.cancelBtn : styles.postBtn} 
          onClick={() => { 
            setShowVendorForm(!showVendorForm); 
            if (showVendorForm) { 
              setEditingVendorId(null); 
              setVendorForm({ company_name: "", service_type: "", contact_phone: "", contact_email: "", website_url: "", notes: "" }); 
            } 
          }}
        >
          {showVendorForm ? "Cancel" : "➕ Add New Vendor"}
        </button>
      </div>

      {showVendorForm && (
        <div className={styles.formCard} style={{ marginBottom: "30px", border: "1px solid #e2e8f0" }}>
          <h4>{editingVendorId !== null ? "📝 Edit Vetted Contractor Records" : "🏢 Onboard Recommended Business Card"}</h4>
          <form onSubmit={handleVendorSubmit} className={styles.announcementForm}>
            <div className={styles.inlineGroup}>
              <div><label>Company Name *</label><input type="text" placeholder="e.g. Piedmont Roofing LLC" value={vendorForm.company_name} onChange={(e) => setVendorForm({...vendorForm, company_name: e.target.value})} required /></div>
              <div><label>Service Type Category *</label><input type="text" placeholder="e.g. Plumbing, Landscaping" value={vendorForm.service_type} onChange={(e) => setVendorForm({...vendorForm, service_type: e.target.value})} required /></div>
            </div>
            <div className={styles.inlineGroup}>
              <div><label>Contact Phone</label><input type="tel" placeholder="e.g. (405) 555-0199" value={vendorForm.contact_phone} onChange={(e) => setVendorForm({...vendorForm, contact_phone: e.target.value})} /></div>
              <div><label>Contact Email</label><input type="email" placeholder="e.g. bids@contractor.com" value={vendorForm.contact_email} onChange={(e) => setVendorForm({...vendorForm, contact_email: e.target.value})} /></div>
            </div>
            <div><label>Official Website URL</label><input type="url" placeholder="https://www.example.com" value={vendorForm.website_url} onChange={(e) => setVendorForm({...vendorForm, website_url: e.target.value})} /></div>
            <div><label>Board Recommendation Note</label><textarea placeholder="Board notes..." value={vendorForm.notes} onChange={(e) => setVendorForm({...vendorForm, notes: e.target.value})} style={{ minHeight: "80px" }} /></div>
            <button type="submit" className={styles.submitBtn}>{editingVendorId !== null ? "Save Contractor Adjustments" : "Publish to Resident Directory"}</button>
          </form>
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Company Profile Name</th>
            <th>Classification Tag</th>
            <th>Contact Access Channels</th>
            <th style={{ textAlign: "right" }}>Administrative Operations Operations</th>
          </tr>
        </thead>
        <tbody>
          {vendorsList.map((vendor) => (
            <tr key={vendor.id}>
              <td style={{ fontWeight: "700", color: "#0f172a" }}>{vendor.company_name}</td>
              <td><span className={styles.typeTag} style={{ backgroundColor: "rgba(46, 204, 113, 0.1)", color: "#2ecc71" }}>{vendor.service_type}</span></td>
              <td style={{ fontSize: "0.85rem", color: "#475569" }}>
                {vendor.contact_phone && <div>📞 {vendor.contact_phone}</div>}
                {vendor.contact_email && <div>✉️ {vendor.contact_email}</div>}
              </td>
              <td style={{ textAlign: "right" }}>
                <div style={{ display: "inline-flex", gap: "8px" }}>
                  <button onClick={() => startEditVendor(vendor)} className={styles.viewBtn} style={{ color: "#3498db" }}>Edit</button>
                  <button onClick={() => handleDeleteVendor(vendor.id)} className={styles.viewBtn} style={{ color: "#ef4444", borderColor: "#fee2e2" }}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}