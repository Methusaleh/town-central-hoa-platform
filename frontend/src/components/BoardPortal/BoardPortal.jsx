import { useState, useEffect, useRef } from "react";
import styles from "./BoardPortal.module.css";

// IMPORT SUBCOMPONENTS
import OperationsDashboard from "./subcomponents/OperationsDashboard";
import RosterDirectory from "./subcomponents/RosterDirectory";
import FinancialLedger from "./subcomponents/FinancialLedger";
import VendorControls from "./subcomponents/VendorControls";

export default function BoardPortal({ user }) {
  const [activeSection, setActiveSection] = useState("requests");[cite: 7]

  // Section States[cite: 7]
  const [requests, setRequests] = useState([]);[cite: 7]
  const [loading, setLoading] = useState(true);[cite: 7]
  const [viewMode, setViewMode] = useState("active");[cite: 7]
  const [showForm, setShowForm] = useState(false);[cite: 7]
  const [showEventForm, setShowEventForm] = useState(false);[cite: 7]
  const [masterRoster, setMasterRoster] = useState([]);[cite: 7]
  
  const [announcement, setAnnouncement] = useState({ title: "", content: "", priority: "normal", channel_type: "general" });[cite: 7]
  const [newEvent, setNewEvent] = useState({ title: "", event_date: "", event_time: "", location: "", description: "", attachment_url: "", attachment_name: "" });[cite: 7]
  const [showRosterModal, setShowRosterModal] = useState(false);[cite: 7]
  const [rosterForm, setRosterForm] = useState({ first_name: "", last_name: "", email: "", street_address: "" });[cite: 7]
  const [rosterStatus, setRosterStatus] = useState({ type: "", text: "" });[cite: 7]
  
  const [financeForm, setFinanceForm] = useState({ street_address: "", balance: "", status: "Pending" });[cite: 7]
  const [financeStatus, setFinanceStatus] = useState({ type: "", text: "" });[cite: 7]

  const [vendorsList, setVendorsList] = useState([]);[cite: 7]
  const [editingVendorId, setEditingVendorId] = useState(null);[cite: 7]
  const [showVendorForm, setShowVendorForm] = useState(false);[cite: 7]
  const [vendorForm, setVendorForm] = useState({ company_name: "", service_type: "", contact_phone: "", contact_email: "", website_url: "", notes: "" });[cite: 7]

  const locationInputRef = useRef(null);[cite: 7]
  const API_BASE = "https://town-central-hoa-platform-469564564131.us-central1.run.app";[cite: 7]

  useEffect(() => {
    fetch(`${API_BASE}/api/requests/admin/all`)[cite: 7]
      .then((res) => res.json())
      .then((data) => { setRequests(data); setLoading(false); })[cite: 7]
      .catch((err) => console.error("Admin fetch error:", err));[cite: 7]
  }, []);

  const fetchVendorsData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/vendors`);[cite: 7]
      const data = await response.json();[cite: 7]
      setVendorsList(data);[cite: 7]
    } catch (err) { console.error(err); }
  };

  const fetchRosterData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/residents/master-list-placeholder`);[cite: 7]
      const data = await response.json();[cite: 7]
      setMasterRoster(data);[cite: 7]
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (activeSection === "vendors") fetchVendorsData();[cite: 7]
    if (activeSection === "financials" || activeSection === "roster") fetchRosterData();[cite: 7]
  }, [activeSection]);

  // Google Calendar Auto-link triggers[cite: 7]
  useEffect(() => {
    if (showEventForm && locationInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(locationInputRef.current, {
        componentRestrictions: { country: "us" },
        fields: ["formatted_address", "name"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        setNewEvent((prev) => ({ ...prev, location: place.formatted_address || place.name }));[cite: 7]
      });
    }
  }, [showEventForm]);

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: announcement.title, message: announcement.content, channel_type: announcement.channel_type, sender_id: user?.id || null }),[cite: 7]
      });
      if (response.ok) {
        alert("Notification dispatched and archived!");[cite: 7]
        setAnnouncement({ title: "", content: "", priority: "normal", channel_type: "general" });[cite: 7]
        setShowForm(false);[cite: 7]
      }
    } catch (err) { console.error(err); }
  };

  const handleResolve = async (requestId) => {
    try {
      const response = await fetch(`${API_BASE}/api/requests/${requestId}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminName: user?.first_name || "Admin" }),[cite: 7]
      });
      if (response.ok) {
        setRequests(requests.map((req) => req.id === requestId ? { ...req, status: "Resolved" } : req));[cite: 7]
      }
    } catch (err) { console.error(err); }
  };

  const handlePostEvent = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),[cite: 7]
      });
      if (response.ok) {
        alert("Event added!");[cite: 7]
        setNewEvent({ title: "", event_date: "", event_time: "", location: "", description: "", attachment_url: "", attachment_name: "" });[cite: 7]
        setShowEventForm(false);[cite: 7]
      }
    } catch (err) { console.error(err); }
  };

  const handleOnboardResident = async (e) => {
    e.preventDefault();
    setRosterStatus({ type: "", text: "" });[cite: 7]
    try {
      const response = await fetch(`${API_BASE}/api/residents/admin-add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rosterForm)[cite: 7]
      });
      const data = await response.json();[cite: 7]
      if (!response.ok) throw new Error(data.error || "Failed to add.");
      setRosterStatus({ type: "success", text: "Resident record established!" });[cite: 7]
      setRosterForm({ first_name: "", last_name: "", email: "", street_address: "" });[cite: 7]
      fetchRosterData();[cite: 7]
    } catch (err) { setRosterStatus({ type: "error", text: err.message }); }[cite: 7]
  };

  const handleUpdateFinanceLedger = async (e) => {
    e.preventDefault();
    setFinanceStatus({ type: "", text: "" });[cite: 7]
    try {
      const response = await fetch(`${API_BASE}/api/dues/update-balance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ street_address: financeForm.street_address, balance: financeForm.balance, status: financeForm.status })[cite: 7]
      });
      const data = await response.json();[cite: 7]
      if (!response.ok) throw new Error(data.error || "Failed.");
      setFinanceStatus({ type: "success", text: "Financial ledger updated successfully!" });[cite: 7]
      setFinanceForm({ street_address: "", balance: "", status: "Pending" });[cite: 7]
    } catch (err) { setFinanceStatus({ type: "error", text: err.message }); }[cite: 7]
  };

  const handleVendorSubmit = async (e) => {
    e.preventDefault();
    const isEditing = editingVendorId !== null;[cite: 7]
    const urlTarget = isEditing ? `${API_BASE}/api/vendors/${editingVendorId}` : `${API_BASE}/api/vendors`;[cite: 7]
    const httpMethod = isEditing ? "PUT" : "POST";[cite: 7]
    try {
      const response = await fetch(urlTarget, {
        method: httpMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorForm)[cite: 7]
      });
      if (response.ok) {
        alert("Vendor saved!");[cite: 7]
        setVendorForm({ company_name: "", service_type: "", contact_phone: "", contact_email: "", website_url: "", notes: "" });[cite: 7]
        setEditingVendorId(null);[cite: 7]
        setShowVendorForm(false);[cite: 7]
        fetchVendorsData();[cite: 7]
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className={styles.container}>
      {/* SECTION NAV BUTTONS[cite: 7] */}
      <div style={{ display: "flex", gap: "25px", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px", overflowX: "auto" }}>
        <button onClick={() => setActiveSection("requests")} style={{ background: "none", border: "none", fontSize: "1.1rem", fontWeight: "700", color: activeSection === "requests" ? "#2ecc71" : "#94a3b8", cursor: "pointer", paddingBottom: "5px", borderBottom: activeSection === "requests" ? "3px solid #2ecc71" : "3px solid transparent" }}>📋 Operations & Tickets</button>
        <button onClick={() => setActiveSection("roster")} style={{ background: "none", border: "none", fontSize: "1.1rem", fontWeight: "700", color: activeSection === "roster" ? "#2ecc71" : "#94a3b8", cursor: "pointer", paddingBottom: "5px", borderBottom: activeSection === "roster" ? "3px solid #2ecc71" : "3px solid transparent" }}>👥 Master Roster</button>
        <button onClick={() => setActiveSection("financials")} style={{ background: "none", border: "none", fontSize: "1.1rem", fontWeight: "700", color: activeSection === "financials" ? "#2ecc71" : "#94a3b8", cursor: "pointer", paddingBottom: "5px", borderBottom: activeSection === "financials" ? "3px solid #2ecc71" : "3px solid transparent" }}>💰 Assessment Ledger</button>
        <button onClick={() => setActiveSection("vendors")} style={{ background: "none", border: "none", fontSize: "1.1rem", fontWeight: "700", color: activeSection === "vendors" ? "#2ecc71" : "#94a3b8", cursor: "pointer", paddingBottom: "5px", borderBottom: activeSection === "vendors" ? "3px solid #2ecc71" : "3px solid transparent" }}>🏢 Verified Vendors</button>
      </div>

      {/* RENDER ACTIVE ISOLATED VIEW LAYER[cite: 7] */}
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