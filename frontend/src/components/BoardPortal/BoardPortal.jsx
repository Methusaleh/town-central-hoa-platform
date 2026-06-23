import { useState, useEffect, useRef } from "react";
import styles from "./BoardPortal.module.css";

export default function BoardPortal({ user }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [announcement, setAnnouncement] = useState({
    title: "",
    content: "",
    priority: "normal",
    channel_type: "general", // Default channel type
  });
  const [viewMode, setViewMode] = useState("active"); // "active" or "archived"
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    event_date: "",
    event_time: "",
    location: "",
    description: "",
  });

  const filteredRequests = requests.filter((req) =>
    viewMode === "active" ? req.status === "Open" : req.status === "Resolved",
  );
  const locationInputRef = useRef(null);

  useEffect(() => {
    fetch(
      "https://town-central-hoa-platform-469564564131.us-central1.run.app/api/requests/admin/all",
    )
      .then((res) => res.json())
      .then((data) => {
        setRequests(data);
        setLoading(false);
      })
      .catch((err) => console.error("Admin fetch error:", err));
  }, []);

  useEffect(() => {
    // Initialize Autocomplete when the Event Form is shown
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
      // Pointed explicitly to the fresh engine gateway endpoint we registered in index.js
      const response = await fetch(
        "https://town-central-hoa-platform-469564564131.us-central1.run.app/api/notifications",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: announcement.title,
            message: announcement.content,
            channel_type: announcement.channel_type, // Passing dynamic channel values
            sender_id: user?.id || null
          }),
        },
      );

      if (response.ok) {
        alert("Notification dispatched and archived in database!");
        setAnnouncement({ title: "", content: "", priority: "normal", channel_type: "general" });
        setShowForm(false);
      } else {
        alert("Failed to submit notification package to the network.");
      }
    } catch (err) {
      console.error("Posting error:", err);
    }
  };

  const handleResolve = async (requestId) => {
    try {
      const response = await fetch(
        `https://town-central-hoa-platform-469564564131.us-central1.run.app/api/requests/${requestId}/resolve`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminName: user?.first_name || "Admin" }),
        },
      );

      if (response.ok) {
        // Update local state so the UI changes instantly
        setRequests(
          requests.map((req) =>
            req.id === requestId ? { ...req, status: "Resolved" } : req,
          ),
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostEvent = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        "https://town-central-hoa-platform-469564564131.us-central1.run.app/api/events",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEvent),
        },
      );

      if (response.ok) {
        alert("Event added to calendar!");
        setNewEvent({
          title: "",
          event_date: "",
          event_time: "",
          location: "",
          description: "",
        });
        setShowEventForm(false);
      }
    } catch (err) {
      console.error("Event post error:", err);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>Executive Management</h2>
        <div className={styles.buttonGroup}>
          <button
            className={showForm ? styles.cancelBtn : styles.postBtn}
            onClick={() => {
              setShowForm(!showForm);
              setShowEventForm(false);
            }}
          >
            {showForm ? "Cancel" : "+ Announcement"}
          </button>
          <button
            className={showEventForm ? styles.cancelBtn : styles.eventBtn}
            onClick={() => {
              setShowEventForm(!showEventForm);
              setShowForm(false);
            }}
          >
            {showEventForm ? "Cancel" : "+ Calendar Event"}
          </button>
        </div>
      </header>

      {/* --- ANNOUNCEMENT FORM --- */}
      {showForm && (
        <div className={styles.formCard}>
          <h3>Post Neighborhood Update</h3>
          <form
            onSubmit={handlePostAnnouncement}
            className={styles.announcementForm}
          >
            <input
              type="text"
              placeholder="Announcement Title (e.g. Pool Opening)"
              value={announcement.title}
              onChange={(e) =>
                setAnnouncement({ ...announcement, title: e.target.value })
              }
              required
            />
            <select
              value={announcement.channel_type}
              onChange={(e) =>
                setAnnouncement({ ...announcement, channel_type: e.target.value })
              }
              className={styles.prioritySelect}
            >
              <option value="general">Standard Dashboard Feed Post</option>
              <option value="critical_email">Critical Email Alert</option>
              <option value="sms_notice">SMS Mobile Text Notice</option>
              <option value="newsletter">Monthly Newsletter Archive</option>
            </select>

            <select
              value={announcement.priority}
              onChange={(e) =>
                setAnnouncement({ ...announcement, priority: e.target.value })
              }
              className={styles.prioritySelect}
            >
              <option value="normal">Normal Priority</option>
              <option value="important">Important (Yellow)</option>
              <option value="urgent">Urgent (Red)</option>
            </select>
            <textarea
              placeholder="Details for the residents..."
              value={announcement.content}
              onChange={(e) =>
                setAnnouncement({ ...announcement, content: e.target.value })
              }
              required
            />
            <button type="submit" className={styles.submitBtn}>
              Post to Feed
            </button>
          </form>
        </div>
      )}

      {/* --- CALENDAR EVENT FORM --- */}
      {showEventForm && (
        <div className={styles.formCard}>
          <h3>Create Neighborhood Event</h3>
          <form onSubmit={handlePostEvent} className={styles.announcementForm}>
            <input
              type="text"
              placeholder="Event Name (e.g., Annual BBQ)"
              value={newEvent.title}
              onChange={(e) =>
                setNewEvent({ ...newEvent, title: e.target.value })
              }
              required
            />
            <div className={styles.inlineGroup}>
              <div>
                <label>Date</label>
                <input
                  type="date"
                  value={newEvent.event_date}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, event_date: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label>Time</label>
                <input
                  type="time"
                  value={newEvent.event_time}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, event_time: e.target.value })
                  }
                />
              </div>
            </div>
            <input
              ref={locationInputRef} // Attach the ref here
              type="text"
              placeholder="Search for a location (e.g. Piedmont Baptist Church)"
              value={newEvent.location}
              onChange={(e) =>
                setNewEvent({ ...newEvent, location: e.target.value })
              }
              required
            />
            <textarea
              placeholder="Additional details for residents..."
              value={newEvent.description}
              onChange={(e) =>
                setNewEvent({ ...newEvent, description: e.target.value })
              }
            />
            <button type="submit" className={styles.submitBtn}>
              Add to Calendar
            </button>
          </form>
        </div>
      )}

      {/* --- REQUESTS TABLE (Shows only if both forms are closed) --- */}
      {!showForm && !showEventForm && (
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3>
              {viewMode === "active"
                ? "Active Resident Requests"
                : "Resolved Archive"}
            </h3>
            <button
              className={styles.toggleBtn}
              onClick={() =>
                setViewMode(viewMode === "active" ? "archived" : "active")
              }
            >
              {viewMode === "active" ? "View Archive" : "Back to Active"}
            </button>
          </div>

          {loading ? (
            <p>Loading requests...</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date Submitted</th>
                  <th>Resident</th>
                  <th>Subject</th>
                  {viewMode === "active" ? (
                    <>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Action</th>
                    </>
                  ) : (
                    <th>Resolved Details</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr key={req.id}>
                    <td className={styles.dateCol}>
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      {req.first_name} {req.last_name}
                    </td>
                    <td>{req.subject}</td>
                    {viewMode === "active" ? (
                      <>
                        <td>
                          <span className={styles.typeTag}>
                            {req.request_type}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${styles.statusOpen}`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className={styles.viewBtn}
                            onClick={() => handleResolve(req.id)}
                          >
                            Resolve & Archive
                          </button>
                        </td>
                      </>
                    ) : (
                      <td className={styles.resolvedInfo}>
                        By {req.resolved_by || "Admin"} on{" "}
                        {req.resolved_at
                          ? new Date(req.resolved_at).toLocaleDateString()
                          : "N/A"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
