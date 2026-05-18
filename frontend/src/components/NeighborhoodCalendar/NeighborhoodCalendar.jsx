import { useState, useEffect } from "react"; // Fixed: Added useEffect import
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import styles from "./NeighborhoodCalendar.module.css";

export default function NeighborhoodCalendar() {
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]); // Fixed: Added events state

  // Fetch live events from your Cloud Run API
  useEffect(() => {
    fetch(
      "https://town-central-hoa-platform-469564564131.us-central1.run.app/api/events",
    )
      .then((res) => res.json())
      .then((data) => {
        setEvents(data);
      })
      .catch((err) => console.error("Calendar fetch error:", err));
  }, []);

  // Helper to normalize dates for comparison (Database dates can be tricky)
  const formatDate = (dateObj) => {
    return new Date(dateObj).toLocaleDateString("en-CA"); // Returns YYYY-MM-DD
  };

  const handleDateChange = (newDate) => {
    setDate(newDate);
    const dateString = formatDate(newDate);

    // Search the live events state instead of MOCK_EVENTS
    const found = events.find((e) => formatDate(e.event_date) === dateString);
    setSelectedEvent(found || null);
  };

  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      const dateString = formatDate(date);
      // Check live events to apply the green dot style
      if (events.some((e) => formatDate(e.event_date) === dateString)) {
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
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location + " Piedmont Oklahoma")}`;
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
        <h3>Event Details</h3>
        {selectedEvent ? (
          <div className={styles.eventInfo}>
            <h4>{selectedEvent.title}</h4>
            <p>🕒 {selectedEvent.event_time || "TBA"}</p>

            <a
              href={getMapsUrl(selectedEvent.location)}
              target="_blank"
              rel="noreferrer"
              className={styles.mapLink}
            >
              📍 {selectedEvent.location} (View on Map)
            </a>

            <p className={styles.description}>{selectedEvent.description}</p>

            <div className={styles.syncContainer}>
              <a
                href={getGoogleCalendarUrl(selectedEvent)}
                target="_blank"
                rel="noreferrer"
                className={styles.googleBtn}
              >
                Sync to Google
              </a>
              <button
                className={styles.appleBtn}
                onClick={() => alert("ICS file generation ready!")}
              >
                Sync to Apple
              </button>
            </div>
          </div>
        ) : (
          <p className={styles.noEvent}>No events scheduled for this day.</p>
        )}
      </div>
    </div>
  );
}
