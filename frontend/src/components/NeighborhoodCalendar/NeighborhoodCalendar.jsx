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

    // Build a manual string for the clicked local date
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, "0");
    const day = String(newDate.getDate()).padStart(2, "0");
    const clickedDate = `${year}-${month}-${day}`;

    // Filter all events to find matches for the clicked date
    const foundEvents = events.filter(
      (e) => formatDate(e.event_date) === clickedDate,
    );
    setSelectedEvent(foundEvents.length > 0 ? foundEvents[0] : null);
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
    // Uses the official Google Maps search query format
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
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
