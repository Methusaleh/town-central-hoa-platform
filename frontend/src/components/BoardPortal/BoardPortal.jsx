import { useState, useEffect } from "react";
import styles from "./BoardPortal.module.css";

export default function BoardPortal() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(
      "https://town-central-hoa-platform-469564564131.us-central1.run.app/api/requests/admin/all",
    )
      .then((res) => res.json())
      .then((data) => {
        setRequests(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>Executive Management</h2>
        <button className={styles.postBtn}>+ New Announcement</button>
      </header>

      <div className={styles.tableCard}>
        <h3>Incoming Resident Requests</h3>
        {loading ? (
          <p>Loading requests...</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Resident</th>
                <th>Type</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>
                    {req.first_name} {req.last_name}
                  </td>
                  <td>
                    <span className={styles.typeTag}>{req.request_type}</span>
                  </td>
                  <td>{req.subject}</td>
                  <td>
                    <span className={styles.status}>{req.status}</span>
                  </td>
                  <td>
                    <button className={styles.viewBtn}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
