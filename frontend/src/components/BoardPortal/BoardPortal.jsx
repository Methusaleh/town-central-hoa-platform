import { useState, useEffect, useRef } from "react";
import styles from "./BoardPortal.module.css";

export default function BoardPortal({ user }) {
  // Master Section Control
  const [activeSection, setActiveSection] = useState("requests"); // "requests", "roster", "financials", or "vendors"

  // Requests Section State
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("active"); // "active" or "archived"
  const [showForm, setShowForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  
  const [announcement, setAnnouncement] = useState({
    title: "",
    content: "",
    priority: "normal",
    channel_type: "general",
  });
  
  const [newEvent, setNewEvent] = useState({
    title: "",
    event_date: "",
    event_time: "",
    location: "",
    description: "",
    attachment_url: "",
    attachment_name: "",
  });

  // --- Roster Management State ---
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterForm, setRosterForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    street_address: ""
  });
  const [rosterStatus, setRosterStatus] = useState({ type: "", text: "" });

  // --- Financials Management State ---
  const [masterRoster, setMasterRoster] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLotText, setSelectedLotText] = useState(""); 
  const [financeForm, setFinanceForm] = useState({
    street_address: "",
    balance: "",
    status: "Pending"
  });
  const [financeStatus, setFinanceStatus] = useState({ type: "", text: "" });

  // --- Vendor Management State ---
  const [vendorsList, setVendorsList] = useState([]);
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    company_name: "",
    service_type: "",
    contact_phone: "",
    contact_email: "",
    website_url: "",
    notes: ""
  });

  const locationInputRef = useRef(null);
  const filteredRequests = requests.filter((req) =>
    viewMode === "active" ? req.status === "Open" : req.status === "Resolved",
  );

  // Live Production Server API URL
  const API_BASE = "https://town-central-hoa-platform-469564564131.us-central1.run.app";

  // Load Initial Requests
  useEffect(() => {
    fetch(`${API_BASE}/api/requests/admin/all`)
      .then((res) => res.json())
      .then((data) => {
        setRequests(data);
        setLoading(false);
      })
      .catch((err) => console.error("Admin fetch error:", err));
  }, []);

  // Fetch Live Vendors Directory Rows
  const fetchVendorsData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/vendors`);
      const data = await response.json();
      setVendorsList(data);
    } catch (err) {
      console.error("Error pulling vendors directory records:", err);
    }
  };

  // FETCH FULL ROSTER FOR AUTOCOMPLETE AND LIST VIEWS
  const fetchRosterData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/residents/master-list-placeholder`);
      const data = await response.json();
      setMasterRoster(data);
    } catch (err) {
      console.error("Error fetching live directory:", err);
    }
  };

  useEffect(() => {
    if (activeSection === "vendors") {
      fetchVendorsData();
    }
    if (activeSection === "financials" || activeSection === "roster") {
      fetchRosterData();
    }
  }, [activeSection]);

  // Handle Google Autocomplete on Events
  useEffect(() => {
    if (showEventForm && locationInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        locationInputRef.current,
        {
          componentRestrictions: { country: "us" },
          fields: ["formatted_address", "name"],
        },
      );
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        setNewEvent((prev) => ({
          ...prev,
          location: place.formatted_address || place.name,
        }));
      });
    }
  }, [showEventForm]);

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: announcement.title,
          message: announcement.content,
          channel_type: announcement.channel_type,
          sender_id: user?.id || null
        }),
      });
      if (response.ok) {
        alert("Notification dispatched and archived in database!");
        setAnnouncement({ title: "", content: "", priority: "normal", channel_type: "general" });
        setShowForm(false);
      } else {
        alert("Failed to submit notification package.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (requestId) => {
    try {
      const response = await fetch(`${API_BASE}/api/requests/${requestId}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminName: user?.first_name || "Admin" }),
      });
      if (response.ok) {
        setRequests(requests.map((req) => req.id === requestId ? { ...req, status: "Resolved" } : req));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostEvent = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });
      if (response.ok) {
        alert("Event added to calendar!");
        setNewEvent({ title: "", event_date: "", event_time: "", location: "", description: "", attachment_url: "", attachment_name: "" });
        setShowEventForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOnboardResident = async (e) => {
    e.preventDefault();
    setRosterStatus({ type: "", text: "" });

    try {
      const response = await fetch(`${API_BASE}/api/residents/admin-add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rosterForm)
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to add user.");

      setRosterStatus({ type: "success", text: "Resident record established successfully!" });
      setRosterForm({ first_name: "", last_name: "", email: "", street_address: "" });
      fetchRosterData();
    } catch (err) {
      setRosterStatus({ type: "error", text: err.message });
    }
  };

  const handleUpdateFinanceLedger = async (e) => {
    e.preventDefault();
    setFinanceStatus({ type: "", text: "" });

    if (!financeForm.street_address) {
      setFinanceStatus({ type: "error", text: "Please select a valid property address string via search lookup." });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/dues/update-balance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          street_address: financeForm.street_address,
          balance: financeForm.balance,
          status: financeForm.status
        })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to update balance.");

      setFinanceStatus({ type: "success", text: data.message || "Financial ledger updated successfully!" });
      setFinanceForm({ street_address: "", balance: "", status: "Pending" });
      setSelectedLotText("");
    } catch (err) {
      setFinanceStatus({ type: "error", text: err.message });
    }
  };

  const handleVendorSubmit = async (e) => {
    e.preventDefault();
    const isEditing = editingVendorId !== null;
    const urlTarget = isEditing ? `${API_BASE}/api/vendors/${editingVendorId}` : `${API_BASE}/api/vendors`;
    const httpMethod = isEditing ? "PUT" : "POST";

    try {
      const response = await fetch(urlTarget, {
        method: httpMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorForm)
      });

      if (response.ok) {
        alert(isEditing ? "Vendor updated successfully!" : "New trusted vendor saved!");
        setVendorForm({ company_name: "", service_type: "", contact_phone: "", contact_email: "", website_url: "", notes: "" });
        setEditingVendorId(null);
        setShowVendorForm(false);
        fetchVendorsData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEditVendor = (vendor) => {
    setEditingVendorId(vendor.id);
    setVendorForm({
      company_name: vendor.company_name,
      service_type: vendor.service_type,
      contact_phone: vendor.contact_phone || "",
      contact_email: vendor.contact_email || "",
      website_url: vendor.website_url || "",
      notes: vendor.notes || ""
    });
    setShowVendorForm(true);
  };

  const handleDeleteVendor = async (id) => {
    if (!window.confirm("Are you sure you want to remove this company?")) return;
    try {
      const response = await fetch(`${API_BASE}/api/vendors/${id}`, { method: "DELETE" });
      if (response.ok) fetchVendorsData();
    } catch (err) {
      console.error(err);
    }
  };

  const autocompleteSuggestions = masterRoster.filter(r => {
    const searchString = selectedLotText.toLowerCase();
    return (
      r.first_name.toLowerCase().includes(searchString) ||
      r.last_name.toLowerCase().includes(searchString) ||
      r.street_address.toLowerCase().includes(searchString)
    );
  });

  return (
    <div className={styles.container}>
      {/* SECTION SELECTOR HEADERS */}
      <div style={{ display: "flex", gap: "25px", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px", overflowX: "auto" }}>
        <button onClick={() => setActiveSection("requests")} style={{ background: "none", border: "none", fontSize: "1.1rem", fontWeight: "700", color: activeSection === "requests" ? "#2ecc71" : "#94a3b8", cursor: "pointer", paddingBottom: "5px", borderBottom: activeSection === "requests" ? "3px solid #2ecc71" : "3px solid transparent" }}>📋 Operations & Tickets</button>
        <button onClick={() => setActiveSection("roster")} style={{ background: "none", border: "none", fontSize: "1.1rem", fontWeight: "700", color: activeSection === "roster" ? "#2ecc71" : "#94a3b8", cursor: "pointer", paddingBottom: "5px", borderBottom: activeSection === "roster" ? "3px solid #2ecc71" : "3px solid transparent" }}>👥 Master Roster</button>
        <button onClick={() => setActiveSection("financials")} style={{ background: "none", border: "none", fontSize: "1.1rem", fontWeight: "700", color: activeSection === "financials" ? "#2ecc71" : "#94a3b8", cursor: "pointer", paddingBottom: "5px", borderBottom: activeSection === "financials" ? "3px solid #2ecc71" : "3px solid transparent" }}>💰 Assessment Ledger</button>
        <button onClick={() => setActiveSection("vendors")} style={{ background: "none", border: "none", fontSize: "1.1rem", fontWeight: "700", color: activeSection === "vendors" ? "#2ecc71" : "#94a3b8", cursor: "pointer", paddingBottom: "5px", borderBottom: activeSection === "vendors" ? "3px solid #2ecc71" : "3px solid transparent" }}>🏢 Verified Vendors</button>
      </div>

      {/* --- SECTION 1: OPERATIONS & TICKETS --- */}
      {activeSection === "requests" && (
        <>
          <header className={styles.header} style={{ marginTop: "10px" }}>
            <h2>Executive Operations Dashboard</h2>
            <div className={styles.buttonGroup}>
              <button className={showForm ? styles.cancelBtn : styles.postBtn} onClick={() => { setShowForm(!showForm); setShowEventForm(false); }}>{showForm ? "Cancel" : "+ Announcement"}</button>
              <button className={showEventForm ? styles.cancelBtn : styles.eventBtn} onClick={() => { setShowEventForm(!showEventForm); setShowForm(false); }}>{showEventForm ? "Cancel" : "+ Calendar Event"}</button>
            </div>
          </header>

          {showForm && (
            <div className={styles.formCard}>
              <h3>Post Neighborhood Update</h3>
              <form onSubmit={handlePostAnnouncement} className={styles.announcementForm}>
                <input type="text" placeholder="Announcement Title" value={announcement.title} onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} required />
                <select value={announcement.channel_type} onChange={(e) => setAnnouncement({ ...announcement, channel_type: e.target.value })} className={styles.prioritySelect}>
                  <option value="general">Standard Dashboard Feed Post</option>
                  <option value="critical_email">Critical Email Alert</option>
                  <option value="sms_notice">SMS Mobile Text Notice</option>
                  <option value="newsletter">Monthly Newsletter Archive</option>
                </select>
                <select value={announcement.priority} onChange={(e) => setAnnouncement({ ...announcement, priority: e.target.value })} className={styles.prioritySelect}>
                  <option value="normal">Normal Priority</option>
                  <option value="important">Important (Yellow)</option>
                  <option value="urgent">Urgent (Red)</option>
                </select>
                <textarea placeholder="Details for the residents..." value={announcement.content} onChange={(e) => setAnnouncement({ ...announcement, content: e.target.value })} required />
                <button type="submit" className={styles.submitBtn}>Post to Feed</button>
              </form>
            </div>
          )}

          {showEventForm && (
            <div className={styles.formCard}>
              <h3>Create Neighborhood Event</h3>
              <form onSubmit={handlePostEvent} className={styles.announcementForm}>
                <input type="text" placeholder="Event Name" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} required />
                <div className={styles.inlineGroup}>
                  <div><label>Date</label><input type="date" value={newEvent.event_date} onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })} required /></div>
                  <div><label>Time</label><input type="time" value={newEvent.event_time} onChange={(e) => setNewEvent({ ...newEvent, event_time: e.target.value })} /></div>
                </div>
                <input ref={locationInputRef} type="text" placeholder="Search for a location" value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} required />
                <div className={styles.inlineGroup}>
                  <div><label>Attachment URL</label><input type="url" placeholder="https://drive.google.com/..." value={newEvent.attachment_url} onChange={(e) => setNewEvent({ ...newEvent, attachment_url: e.target.value })} /></div>
                  <div><label>Friendly File Label</label><input type="text" placeholder="Meeting_Agenda.pdf" value={newEvent.attachment_name} onChange={(e) => setNewEvent({ ...newEvent, attachment_name: e.target.value })} /></div>
                </div>
                <textarea placeholder="Additional details..." value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} />
                <button type="submit" className={styles.submitBtn}>Add to Calendar</button>
              </form>
            </div>
          )}

          {!showForm && !showEventForm && (
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3>{viewMode === "active" ? "Active Resident Requests" : "Resolved Archive"}</h3>
                <button className={styles.toggleBtn} onClick={() => setViewMode(viewMode === "active" ? "archived" : "active")}>{viewMode === "active" ? "View Archive" : "Back to Active"}</button>
              </div>
              {loading ? <p>Loading requests...</p> : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date Submitted</th>
                      <th>Resident</th>
                      <th>Subject / Description</th>
                      <th>Type</th>
                      <th>Status</th>
                      {viewMode === "active" && <th>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req) => (
                      <tr key={req.id}>
                        <td className={styles.dateCol}>{new Date(req.created_at).toLocaleDateString()}</td>
                        <td style={{ fontWeight: "600" }}>{req.first_name} {req.last_name}</td>
                        <td>
                          <div style={{ fontWeight: "700", color: "#0f172a" }}>{req.subject}</div>
                          <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px", background: "#f8fafc", padding: "8px", borderRadius: "6px", borderLeft: "3px solid #cbd5e1" }}>{req.description || "No text description details provided."}</div>
                        </td>
                        <td><span className={styles.typeTag}>{req.request_type}</span></td>
                        <td><span className={`${styles.statusBadge} ${styles.statusOpen}`}>{req.status}</span></td>
                        {viewMode === "active" ? (
                          <td><button className={styles.viewBtn} onClick={() => handleResolve(req.id)}>Resolve & Archive</button></td>
                        ) : (
                          <td className={styles.resolvedInfo}>By {req.resolved_by || "Admin"} on {req.resolved_at ? new Date(req.resolved_at).toLocaleDateString() : "N/A"}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* --- SECTION 2: MASTER ROSTER DIRECTORY VIEW --- */}
      {activeSection === "roster" && (
        <div className={styles.tableCard} style={{ marginTop: "10px" }}>
          <div className={styles.tableHeader}>
            <div>
              <h3 style={{ margin: 0 }}>Roster Security Directory</h3>
              <p style={{ margin: "5px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>Displaying all pre-seeded neighborhood properties and claimed user profiles.</p>
            </div>
            <button className={styles.postBtn} onClick={() => setShowRosterModal(!showRosterModal)}>{showRosterModal ? "Close Form" : "➕ Onboard Property"}</button>
          </div>

          {showRosterModal && (
            <div className={styles.formCard} style={{ marginBottom: "25px", border: "1px solid #e2e8f0" }}>
              <h4>Register New Neighborhood Lot Row</h4>
              {rosterStatus.text && (
                <div style={{ padding: "10px", borderRadius: "6px", marginBottom: "15px", backgroundColor: rosterStatus.type === "success" ? "#d4edda" : "#f8d7da", color: rosterStatus.type === "success" ? "#155724" : "#721c24" }}>{rosterStatus.text}</div>
              )}
              <form onSubmit={handleOnboardResident} className={styles.announcementForm}>
                <div className={styles.inlineGroup}>
                  <div><label>First Name *</label><input type="text" value={rosterForm.first_name} onChange={(e) => setRosterForm({...rosterForm, first_name: e.target.value})} required /></div>
                  <div><label>Last Name *</label><input type="text" value={rosterForm.last_name} onChange={(e) => setRosterForm({...rosterForm, last_name: e.target.value})} required /></div>
                </div>
                <div><label>Preferred Contact Email</label><input type="email" placeholder="Optional until user claims account" value={rosterForm.email} onChange={(e) => setRosterForm({...rosterForm, email: e.target.value})} /></div>
                <div><label>Street Address Assignment *</label><input type="text" placeholder="e.g. 742 Evergreen Terrace" value={rosterForm.street_address} onChange={(e) => setRosterForm({...rosterForm, street_address: e.target.value})} required /></div>
                <button type="submit" className={styles.submitBtn}>Write Secure Roster Entry</button>
              </form>
            </div>
          )}

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Lot ID</th>
                <th>Full Resident Name</th>
                <th>Assigned Street Address</th>
                <th>Email Registration Hook</th>
                <th>Portal Claim Status</th>
              </tr>
            </thead>
            <tbody>
              {masterRoster.map((res) => (
                <tr key={res.id}>
                  <td style={{ fontWeight: "700", color: "#64748b" }}>{res.lot_number || `LOT-${100 + res.id}`}</td>
                  <td style={{ fontWeight: "600" }}>{res.first_name} {res.last_name}</td>
                  <td>📍 {res.street_address}</td>
                  <td style={{ color: res.email ? "#0f172a" : "#94a3b8" }}>{res.email || "No email assigned"}</td>
                  <td>
                    <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", backgroundColor: res.is_claimed ? "#d1fae5" : "#f1f5f9", color: res.is_claimed ? "#065f46" : "#475569" }}>
                      {res.is_claimed ? "🔒 Claimed" : "⏳ Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- SECTION 3: ASSESSMENT LEDGER --- */}
      {activeSection === "financials" && (
        <div className={styles.tableCard} style={{ marginTop: "10px" }}>
          <div className={styles.tableHeader}>
            <div>
              <h3 style={{ margin: 0 }}>Resident Assessment Ledger</h3>
              <p style={{ margin: "5px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>Type any name or street segment to fetch the underlying ledger record row.</p>
            </div>
          </div>

          <div className={styles.formCard} style={{ border: "1px solid #e2e8f0", maxWidth: "600px" }}>
            <h4>Update Ledger Statement</h4>
            {financeStatus.text && (
              <div style={{ padding: "10px", borderRadius: "6px", marginBottom: "15px", backgroundColor: financeStatus.type === "success" ? "#d4edda" : "#f8d7da", color: financeStatus.type === "success" ? "#155724" : "#721c24" }}>
                {financeStatus.text}
              </div>
            )}
            <form onSubmit={handleUpdateFinanceLedger} className={styles.announcementForm}>
              <div style={{ position: "relative" }}>
                <label>Search Resident Name or Street Address *</label>
                <input 
                  type="text" 
                  placeholder="Type Aaron, Becky, Thomas, 1559, etc..." 
                  value={selectedLotText} 
                  onChange={(e) => {
                    setSelectedLotText(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                  required 
                  autoComplete="off"
                />
                
                {showSuggestions && selectedLotText && autocompleteSuggestions.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 1000, maxHeight: "180px", overflowY: "auto", marginTop: "4px" }}>
                    {autocompleteSuggestions.map((lot) => (
                      <div
                        key={lot.id}
                        onMouseDown={() => {
                          setFinanceForm({ ...financeForm, street_address: lot.street_address });
                          setSelectedLotText(`${lot.first_name} ${lot.last_name} (${lot.street_address})`);
                          setShowSuggestions(false);
                        }}
                        style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: "0.9rem" }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = "#f8fafc"}
                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                      >
                        👤 <strong>{lot.first_name} {lot.last_name}</strong> — 📍 {lot.street_address}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.inlineGroup} style={{ alignItems: "flex-end" }}>
                <div>
                  <label>Outstanding Assessment Balance ($) *</label>
                  <input type="number" step="0.01" placeholder="0.00" value={financeForm.balance} onChange={(e) => setFinanceForm({...financeForm, balance: e.target.value})} required />
                </div>
                <div>
                  <label>Payment Status Assignment</label>
                  <select value={financeForm.status} onChange={(e) => setFinanceForm({...financeForm, status: e.target.value})} className={styles.prioritySelect}>
                    <option value="Pending">Pending / Unpaid</option>
                    <option value="Partial">Partial Payment</option>
                    <option value="Paid">Paid in Full</option>
                  </select>
                </div>
              </div>
              <button type="submit" className={styles.submitBtn} style={{ backgroundColor: "#3498db" }}>Commit Ledger Overwrite</button>
            </form>
          </div>
        </div>
      )}

      {/* --- SECTION 4: VERIFIED VENDORS --- */}
      {activeSection === "vendors" && (
        <div className={styles.tableCard} style={{ marginTop: "10px" }}>
          <div className={styles.tableHeader}>
            <div>
              <h3 style={{ margin: 0 }}>Trusted Companies Directory Control</h3>
              <p style={{ margin: "5px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>Add, modify, or remove contractor and business recommendation rows visible to homeowners.</p>
            </div>
            <button className={showVendorForm ? styles.cancelBtn : styles.postBtn} onClick={() => { setShowVendorForm(!showVendorForm); if (showVendorForm) { setEditingVendorId(null); setVendorForm({ company_name: "", service_type: "", contact_phone: "", contact_email: "", website_url: "", notes: "" }); } }}>{showVendorForm ? "Cancel" : "➕ Add New Vendor"}</button>
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
      )}
    </div>
  );
}