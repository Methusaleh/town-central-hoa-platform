import { useState } from "react";
import styles from "../BoardPortal.module.css";

export default function OperationsDashboard({ 
  requests, 
  loading, 
  viewMode, 
  setViewMode, 
  showForm, 
  setShowForm, 
  showEventForm, 
  setShowEventForm,
  announcement,
  setAnnouncement,
  newEvent,
  setNewEvent,
  handlePostAnnouncement,
  handlePostEvent,
  handleResolve,
  locationInputRef
}) {
  const filteredRequests = requests.filter((req) =>
    viewMode === "active" ? req.status === "Open" : req.status === "Resolved"
  );

  return (
    <>
      <header className={styles.header} style={{ marginTop: "10px" }}>
        <h2>Executive Operations Dashboard</h2>
        <div className={styles.buttonGroup}>
          <button 
            className={showForm ? styles.cancelBtn : styles.postBtn} 
            onClick={() => { setShowForm(!showForm); setShowEventForm(false); }}
          >
            {showForm ? "Cancel" : "+ Announcement"}
          </button>
          <button 
            className={showEventForm ? styles.cancelBtn : styles.eventBtn} 
            onClick={() => { setShowEventForm(!showEventForm); setShowForm(false); }}
          >
            {showEventForm ? "Cancel" : "+ Calendar Event"}
          </button>
        </div>
      </header>

      {showForm && (
        <div className={styles.formCard}>
          <h3>Post Neighborhood Update</h3>
          <form onSubmit={handlePostAnnouncement} className={styles.announcementForm}>
            <input 
              type="text" 
              placeholder="Announcement Title" 
              value={announcement.title} 
              onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} 
              required 
            />
            <select 
              value={announcement.channel_type} 
              onChange={(e) => setAnnouncement({ ...announcement, channel_type: e.target.value })} 
              className={styles.prioritySelect}
            >
              <option value="general">Standard Dashboard Feed Post</option>
              <option value="critical_email">Critical Email Alert</option>
              <option value="sms_notice">SMS Mobile Text Notice</option>
              <option value="newsletter">Monthly Newsletter Archive</option>
            </select>
            <select 
              value={announcement.priority} 
              onChange={(e) => setAnnouncement({ ...announcement, priority: e.target.value })} 
              className={styles.prioritySelect}
            >
              <option value="normal">Normal Priority</option>
              <option value="important">Important (Yellow)</option>
              <option value="urgent">Urgent (Red)</option>
            </select>
            <textarea 
              placeholder="Details for the residents..." 
              value={announcement.content} 
              onChange={(e) => setAnnouncement({ ...announcement, content: e.target.value })} 
              required 
            />
            <button type="submit" className={styles.submitBtn}>Post to Feed</button>
          </form>
        </div>
      )}

      {showEventForm && (
        <div className={styles.formCard}>
          <h3>Create Neighborhood Event</h3>
          <form onSubmit={handlePostEvent} className={styles.announcementForm}>
            <input 
              type="text" 
              placeholder="Event Name" 
              value={newEvent.title} 
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} 
              required 
            />
            <div className={styles.inlineGroup}>
              <div>
                <label>Date</label>
                <input 
                  type="date" 
                  value={newEvent.event_date} 
                  onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })} 
                  required 
                />
              </div>
              <div>
                <label>Time</label>
                <input 
                  type="time" 
                  value={newEvent.event_time} 
                  onChange={(e) => setNewEvent({ ...newEvent, event_time: e.target.value })} 
                />
              </div>
            </div>
            <input 
              ref={locationInputRef} 
              type="text" 
              placeholder="Search for a location" 
              value={newEvent.location} 
              onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} 
              required 
            />
            <div>
              <label>Event Attachment</label>
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files.length > 0) {
                    // You'll need to handle the upload here or store the file object
                    setNewEvent({ ...newEvent, attachment_name: e.dataTransfer.files[0].name });
                    // NOTE: To actually upload, you'd trigger your uploadToR2 function here!
                  }
                }}
                style={{ 
                  border: "2px dashed #cbd5e1", 
                  borderRadius: "8px", 
                  padding: "20px", 
                  textAlign: "center", 
                  background: "#f8fafc",
                  cursor: "pointer"
                }}
                onClick={() => document.getElementById("event-file-input").click()}
              >
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#64748b" }}>
                  {newEvent.attachment_name ? `File: ${newEvent.attachment_name}` : "Drop file here or click to browse"}
                </p>
                <input 
                  id="event-file-input"
                  type="file" 
                  hidden 
                  onChange={(e) => setNewEvent({ ...newEvent, attachment_name: e.target.files[0].name })} 
                />
              </div>
            </div>
            <textarea 
              placeholder="Additional details..." 
              value={newEvent.description} 
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} 
            />
            <button type="submit" className={styles.submitBtn}>Add to Calendar</button>
          </form>
        </div>
      )}

      {!showForm && !showEventForm && (
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3>{viewMode === "active" ? "Active Resident Requests" : "Resolved Archive"}</h3>
            <button 
              className={styles.toggleBtn} 
              onClick={() => setViewMode(viewMode === "active" ? "archived" : "active")}
            >
              {viewMode === "active" ? "View Archive" : "Back to Active"}
            </button>
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
                      <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px", background: "#f8fafc", padding: "8px", borderRadius: "6px", borderLeft: "3px solid #cbd5e1" }}>
                        {req.description || "No text description details provided."}
                      </div>
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
  );
}