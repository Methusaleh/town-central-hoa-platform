import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import styles from "./NeighborhoodCalendar.module.css";

// Move mock data here - outside the component
const MOCK_EVENTS = [
  {
    date: "2026-05-20",
    title: "Board Meeting",
    time: "7:00 PM",
    loc: "Library",
  },
  { date: "2026-05-23", title: "Pool Opening", time: "10:00 AM", loc: "Pool" },
];

export default function NeighborhoodCalendar() {
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  const handleDateChange = (newDate) => {
    setDate(newDate);
    // Format date to YYYY-MM-DD to match our mock data
    const dateString = newDate.toLocaleDateString("en-CA");
    const found = MOCK_EVENTS.find((e) => e.date === dateString);
    setSelectedEvent(found || null);
  };

  const getGoogleCalendarUrl = (event) => {
    const baseUrl =
      "https://calendar.google.com/calendar/render?action=TEMPLATE";
    // Format: YYYYMMDDTHHmmSSZ (Simplified for mock)
    const dateStr = event.date.replace(/-/g, "");
    return `${baseUrl}&text=${encodeURIComponent(event.title)}&dates=${dateStr}/${dateStr}&details=${encodeURIComponent(event.loc)}`;
  };

  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      const dateString = date.toLocaleDateString("en-CA");
      if (MOCK_EVENTS.some((e) => e.date === dateString)) {
        return styles.eventDay; // Applies the green dot style
      }
    }
    return null;
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
          tileClassName={tileClassName} // Adds dots to days with events
        />
      </div>

      <div className={styles.eventDetail}>
        <h3>Event Details</h3>
        {selectedEvent ? (
          <div className={styles.eventInfo}>
            <h4>{selectedEvent.title}</h4>
            <p>🕒 {selectedEvent.time}</p>

            <a
              href={getMapsUrl(selectedEvent.loc)}
              target="_blank"
              rel="noreferrer"
              className={styles.mapLink}
            >
              📍 {selectedEvent.loc} (View on Map)
            </a>

            <div className={styles.syncContainer}>
              <a
                href={getGoogleCalendarUrl(selectedEvent)}
                target="_blank"
                rel="noreferrer"
                className={styles.googleBtn}
              >
                Google
              </a>
              <button
                className={styles.appleBtn}
                onClick={() => alert("ICS file generation ready!")}
              >
                Apple
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
