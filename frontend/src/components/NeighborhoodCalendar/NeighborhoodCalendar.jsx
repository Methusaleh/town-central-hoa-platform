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

  return (
    <div className={styles.calendarWrapper}>
      <div className={styles.calendarContainer}>
        <Calendar
          onChange={handleDateChange}
          value={date}
          className={styles.customCalendar}
        />
      </div>

      <div className={styles.eventDetail}>
        <h3>Event Details</h3>
        {selectedEvent ? (
          <div className={styles.eventInfo}>
            <h4>{selectedEvent.title}</h4>
            <p>🕒 {selectedEvent.time}</p>
            <p>📍 {selectedEvent.loc}</p>

            {/* New Sync Container replaces the old button */}
            <div className={styles.syncContainer}>
              <a
                href={getGoogleCalendarUrl(selectedEvent)}
                target="_blank"
                rel="noreferrer"
                className={styles.googleBtn}
              >
                + Google Calendar
              </a>
              <button
                className={styles.appleBtn}
                onClick={() =>
                  alert(
                    "Apple Calendar uses .ics files - we'll build that generator next!",
                  )
                }
              >
                + Apple Calendar
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
