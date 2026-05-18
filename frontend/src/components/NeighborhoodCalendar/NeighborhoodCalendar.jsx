import { useState, useEffect } from "react"; // Fixed: Added useEffect import
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import styles from "./NeighborhoodCalendar.module.css";

export default function NeighborhoodCalendar() {
  const [date, setDate] = useState(new Date());
  const [selectedEvents, setSelectedEvents] = useState([]);
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

    // 1. Build a manual YYYY-MM-DD string for the clicked local date
    // This ensures we match the "Strict" formatting of the database dates
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, "0");
    const day = String(newDate.getDate()).padStart(2, "0");
    const clickedDate = `${year}-${month}-${day}`;

    // 2. Filter all events to find EVERY match for the clicked date
    const foundEvents = events.filter(
      (e) => formatDate(e.event_date) === clickedDate,
    );

    // 3. Pass the entire array to state (plural)
    // This ensures your .map() function has a list to work with
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
        <h3>Events for {date.toLocaleDateString()}</h3>

        {selectedEvents.length > 0 ? (
          <div className={styles.eventList}>
            {selectedEvents.map((event, index) => (
              <div key={event.id || index} className={styles.eventInfo}>
                <h4>{event.title}</h4>
                <p>🕒 {event.event_time || "All Day"}</p>

                <a
                  href={getMapsUrl(event.location)}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.mapLink}
                >
                  📍 {event.location || "No location set"}
                </a>

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
                {/* Add a divider if there's more than one event */}
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
    </div>
  );
}
