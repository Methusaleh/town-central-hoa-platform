import { useState, useEffect } from "react";
import styles from "./BoardPortal.module.css";

export default function BoardPortal() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [announcement, setAnnouncement] = useState({ title: "", content: "" });

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

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        "https://town-central-hoa-platform-469564564131.us-central1.run.app/api/announcements",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: announcement.title,
            content: announcement.content,
            priority: "normal", // You can add a priority selector to the form later
          }),
        },
      );

      if (response.ok) {
        alert("Announcement posted successfully!");
        setAnnouncement({ title: "", content: "" });
        setShowForm(false);
        window.location.reload();
      } else {
        alert("Failed to post announcement to server.");
      }
    } catch (err) {
      console.error("Posting error:", err);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>Executive Management</h2>
        <button
          className={showForm ? styles.cancelBtn : styles.postBtn}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ New Announcement"}
        </button>
      </header>

      {showForm ? (
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
      ) : (
        <div className={styles.tableCard}>
          <h3>Incoming Resident Requests</h3>
          {loading ? (
            <p>Loading requests...</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Resident</th>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td className={styles.dateCol}>
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      {req.first_name} {req.last_name}
                    </td>
                    <td>
                      <span className={styles.typeTag}>{req.request_type}</span>
                    </td>
                    <td>{req.subject}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${req.status === "Open" ? styles.statusOpen : styles.statusResolved}`}
                      >
                        {req.status}
                      </span>
                    </td>
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
