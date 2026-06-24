import { useState, useEffect, useRef } from "react";
import styles from "./BoardPortal.module.css";

// IMPORT SUBCOMPONENTS
import OperationsDashboard from "./subcomponents/OperationsDashboard";
import RosterDirectory from "./subcomponents/RosterDirectory";
import FinancialLedger from "./subcomponents/FinancialLedger";
import VendorControls from "./subcomponents/VendorControls";

export default function BoardPortal({ user }) {
  const [activeSection, setActiveSection] = useState("requests");

  // Section States
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [masterRoster, setMasterRoster] = useState([]);
  
  const [announcement, setAnnouncement] = useState({ title: "", content: "", priority: "normal", channel_type: "general" });
  const [newEvent, setNewEvent] = useState({ title: "", event_date: "", event_time: "", location: "", description: "", attachment_url: "", attachment_name: "" });
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterForm, setRosterForm] = useState({ first_name: "", last_name: "", email: "", street_address: "" });
  const [rosterStatus, setRosterStatus] = useState({ type: "", text: "" });
  
  const [financeForm, setFinanceForm] = useState({ street_address: "", balance: "", status: "Pending" });
  const [financeStatus, setFinanceStatus] = useState({ type: "", text: "" });

  const [vendorsList, setVendorsList] = useState([]);
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorForm, setVendorForm] = useState({ company_name: "", service_type: "", contact_phone: "", contact_email: "", website_url: "", notes: "" });

  const locationInputRef = useRef(null);
  const API_BASE = "https://town-central-hoa-platform-469564564131.us-central1.run.app";

  useEffect(() => {
    fetch(`${API_BASE}/api/requests/admin/all`)
      .then((res) => res.json())
      .then((data) => { setRequests(data); setLoading(false); })
      .catch((err) => console.error("Admin fetch error:", err));
  }, []);

  const fetchVendorsData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/vendors`);
      const data = await response.json();
      setVendorsList(data);
    } catch (err) { console.error(err); }
  };

  const fetchRosterData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/residents/master-list-placeholder`);
      const data = await response.json();
      setMasterRoster(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (activeSection === "vendors") fetchVendorsData();
    if (activeSection === "financials" || activeSection === "roster") fetchRosterData();
  }, [activeSection]);

  // Google Calendar Auto-link triggers
  useEffect(() => {
    if (showEventForm && locationInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(locationInputRef.current, {
        componentRestrictions: { country: "us" },
        fields: ["formatted_address", "name"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        setNewEvent((prev) => ({ ...prev, location: place.formatted_address || place.name }));
      });
    }
  }, [showEventForm]);

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: announcement.title, message: announcement.content, channel_type: announcement.channel_type, sender_id: user?.id || null }),
      });
      if (response.ok) {
        alert("Notification dispatched and archived!");
        setAnnouncement({ title: "", content: "", priority: "normal", channel_type: "general" });
        setShowForm(false);
      }
    } catch (err) { console.error(err); }
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
    } catch (err) { console.error(err); }
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
        alert("Event added!");
        setNewEvent({ title: "", event_date: "", event_time: "", location: "", description: "", attachment_url: "", attachment_name: "" });
        setShowEventForm(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleOnboardResident = async (e, welcomePacket) => {
    e.preventDefault();
    setRosterStatus({ type: "", text: "" });
    try {
      const response = await fetch(`${API_BASE}/api/residents/admin-add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send the state form fields alongside our new welcome injection flag
        body: JSON.stringify({ ...rosterForm, sendWelcomePacket: welcomePacket })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add.");
      setRosterStatus({ type: "success", text: "Resident record established!" });
      setRosterForm({ first_name: "", last_name: "", email: "", street_address: "" });
      fetchRosterData();
    } catch (err) { setRosterStatus({ type: "error", text: err.message }); }
  };

  const handleUpdateFinanceLedger = async (e) => {
    e.preventDefault();
    setFinanceStatus({ type: "", text: "" });
    try {
      const response = await fetch(`${API_BASE}/api/dues/update-balance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ street_address: financeForm.street_address, balance: financeForm.balance, status: financeForm.status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed.");
      setFinanceStatus({ type: "success", text: "Financial ledger updated successfully!" });
      setFinanceForm({ street_address: "", balance: "", status: "Pending" });
    } catch (err) { setFinanceStatus({ type: "error", text: err.message }); }
  };

  // RESTORED: Vendor control action methods to satisfy child injection mappings
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
    } catch (err) { console.error(err); }
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
        alert("Vendor saved!");
        setVendorForm({ company_name: "", service_type: "", contact_phone: "", contact_email: "", website_url: "", notes: "" });
        setEditingVendorId(null);
        setShowVendorForm(false);
        fetchVendorsData();
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className={styles.container}>
      {/* SECTION NAV BUTTONS */}
      <div style={{ display: "flex", gap: "25px", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px", overflowX: "auto" }}>
        <button onClick={() => setActiveSection("requests")} style={{ background: "none", border: "none", fontSize: "1.1rem", fontWeight: "700", color: activeSection === "requests" ? "#2ecc71" : "#94a3b8", cursor: "pointer", paddingBottom: "5px", borderBottom: activeSection === "requests" ? "3px solid #2ecc71" : "3px solid transparent" }}>📋 Operations & Tickets</button>
        <button onClick={() => setActiveSection("roster")} style={{ background: "none", border: "none", fontSize: "1.1rem", fontWeight: "700", color: activeSection === "roster" ? "#2ecc71" : "#94a3b8", cursor: "pointer", paddingBottom: "5px", borderBottom: activeSection === "roster" ? "3px solid #2ecc71" : "3px solid transparent" }}>👥 Master Roster</button>
        <button onClick={() => setActiveSection("financials")} style={{ background: "none", border: "none", fontSize: "1.1rem", fontWeight: "700", color: activeSection === "financials" ? "#2ecc71" : "#94a3b8", cursor: "pointer", paddingBottom: "5px", borderBottom: activeSection === "financials" ? "3px solid #2ecc71" : "3px solid transparent" }}>💰 Assessment Ledger</button>
        <button onClick={() => setActiveSection("vendors")} style={{ background: "none", border: "none", fontSize: "1.1rem", fontWeight: "700", color: activeSection === "vendors" ? "#2ecc71" : "#94a3b8", cursor: "pointer", paddingBottom: "5px", borderBottom: activeSection === "vendors" ? "3px solid #2ecc71" : "3px solid transparent" }}>🏢 Verified Vendors</button>
      </div>

      {/* RENDER ACTIVE ISOLATED VIEW LAYER */}
      {activeSection === "requests" && (
        <OperationsDashboard 
          requests={requests} loading={loading} viewMode={viewMode} setViewMode={setViewMode}
          showForm={showForm} setShowForm={setShowForm} showEventForm={showEventForm} setShowEventForm={setShowEventForm}
          announcement={announcement} setAnnouncement={setAnnouncement} newEvent={newEvent} setNewEvent={setNewEvent}
          handlePostAnnouncement={handlePostAnnouncement} handlePostEvent={handlePostEvent} handleResolve={handleResolve}
          locationInputRef={locationInputRef}
        />
      )}

      {activeSection === "roster" && (
        <RosterDirectory 
          masterRoster={masterRoster} showRosterModal={showRosterModal} setShowRosterModal={setShowRosterModal}
          rosterForm={rosterForm} setRosterForm={setRosterForm} rosterStatus={rosterStatus} handleOnboardResident={handleOnboardResident}
        />
      )}

      {activeSection === "financials" && (
        <FinancialLedger 
          masterRoster={masterRoster} financeForm={financeForm} setFinanceForm={setFinanceForm}
          financeStatus={financeStatus} handleUpdateFinanceLedger={handleUpdateFinanceLedger}
        />
      )}

      {activeSection === "vendors" && (
        <VendorControls 
          showVendorForm={showVendorForm} setShowVendorForm={setShowVendorForm} editingVendorId={editingVendorId}
          setEditingVendorId={setEditingVendorId} vendorForm={vendorForm} setVendorForm={setVendorForm}
          vendorsList={vendorsList} handleVendorSubmit={handleVendorSubmit} startEditVendor={startEditVendor}
          handleDeleteVendor={handleDeleteVendor}
        />
      )}
    </div>
  );
}