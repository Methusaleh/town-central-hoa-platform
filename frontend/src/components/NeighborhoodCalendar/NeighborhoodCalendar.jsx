import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import EventCreationModal from "./EventCreationModal";
import "react-calendar/dist/Calendar.css";
import styles from "./NeighborhoodCalendar.module.css";
import { apiFetch } from "../../api";

export default function NeighborhoodCalendar({ user }) {
  const [date, setDate] = useState(new Date());
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [events, setEvents] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const isAdmin = user?.role === "board_member" || user?.role === "super_admin";

  const loadEvents = () => {
    apiFetch("/api/events")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setEvents(list);
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const todayStr = `${year}-${month}-${day}`;
        setSelectedEvents(list.filter((e) => formatDate(e.event_date) === todayStr));
      })
      .catch((err) => console.error("Calendar fetch error:", err));
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Helper to normalize dates for comparison
  const formatDate = (dateInput) => {
    if (!dateInput) return null;

    const d = new Date(dateInput);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (newDate) => {
    setDate(newDate);

    // Build a manual YYYY-MM-DD string for the clicked local date
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, "0");
    const day = String(newDate.getDate()).padStart(2, "0");
    const clickedDate = `${year}-${month}-${day}`;

    // Filter all events to find every match for the clicked date
    const foundEvents = events.filter(
      (e) => formatDate(e.event_date) === clickedDate,
    );

    setSelectedEvents(foundEvents);
  };

  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const calendarDate = `${year}-${month}-${day}`;

      if (events.some((e) => formatDate(e.event_date) === calendarDate)) {
        return styles.eventDay;
      }
    }
    return null;
  };

  // Google Calendar Sync Helper
  const getGoogleCalendarUrl = (event) => {
    const baseUrl =
      "https://calendar.google.com/calendar/render?action=TEMPLATE";
    const dateStr = formatDate(event.event_date).replace(/-/g, "");
    return `${baseUrl}&text=${encodeURIComponent(event.title)}&dates=${dateStr}/${dateStr}&details=${encodeURIComponent(event.location || "")}`;
  };

  // Map URL helper
  const getMapsUrl = (location) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  };

  const formatEventTime = (timeStr) => {
    if (!timeStr) return "All Day";
    
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? "P.M." : "A.M.";
      
      hours = hours % 12;
      hours = hours ? hours : 12; 
      
      return `${hours}:${minutes} ${ampm}`;
    }
    return timeStr;
  };

  return (
    <div className={styles.calendarWrapper}>
      <div className={styles.calendarContainer}>
        <Calendar
          onChange={handleDateChange}
          value={date}
          className={styles.customCalendar}
          tileClassName={tileClassName}
        />
      </div>

      <div className={styles.eventDetail}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h3 style={{ margin: 0 }}>Events for {date.toLocaleDateString()}</h3>
          {isAdmin && (
            <button 
              onClick={() => setShowEventModal(true)}
              style={{ background: "#2ecc71", color: "white", border: "none", padding: "6px 12px", borderRadius: "8px", fontWeight: "700", fontSize: "0.8rem", cursor: "pointer" }}
            >
              ➕ Create Event
            </button>
          )}
        </div>

        {selectedEvents.length > 0 ? (
          <div className={styles.eventList}>
            {selectedEvents.map((event, index) => (
              <div key={event.id || index} className={styles.eventInfo}>
                <h4>{event.title}</h4>
                <p>🕒 {formatEventTime(event.event_time)}</p>

                <a
                  href={getMapsUrl(event.location)}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.mapLink}
                >
                  📍 {event.location || "No location set"}
                </a>

                {event.attachment_url && (
                  <div style={{ margin: "14px 0", padding: "2px 0" }}>
                    <a 
                      href={event.attachment_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "0.85rem",
                        color: "#e67e22",
                        fontWeight: "700",
                        textDecoration: "none",
                        backgroundColor: "#fff5eb",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #fde6d2",
                        transition: "all 0.2s ease"
                      }}
                    >
                      📎 {event.attachment_name || "View Attached Document"}
                    </a>
                  </div>
                )}

                {event.description && (
                  <p className={styles.description}>{event.description}</p>
                )}

                <div className={styles.syncContainer}>
                  <a
                    href={getGoogleCalendarUrl(event)}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.googleBtn}
                  >
                    Add to Google
                  </a>
                </div>
                
                {index < selectedEvents.length - 1 && (
                  <hr className={styles.divider} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noEvent}>No events scheduled for this day.</p>
        )}
      </div>

      {showEventModal && (
        <EventCreationModal 
          onClose={() => setShowEventModal(false)} 
          onEventCreated={loadEvents} 
        />
      )}
    </div>
  );
}