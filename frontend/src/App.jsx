import { useEffect, useState } from "react";

export default function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Uses your Vercel Environment Variable
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

    fetch(`${API_URL}/api/users`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "600px",
        margin: "0 auto",
        fontFamily: "system-ui",
      }}
    >
      <h1>Town Central HOA</h1>
      <hr />

      <h2>Resident Directory</h2>

      {loading && <p>Searching the records...</p>}

      {error && (
        <div style={{ color: "red", border: "1px solid red", padding: "10px" }}>
          <strong>Connection Error:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {users.map((user) => (
            <li
              key={user.id}
              style={{
                padding: "15px",
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>
                {user.first_name} {user.last_name}
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  background: "#e0e0e0",
                  padding: "2px 8px",
                  borderRadius: "10px",
                }}
              >
                {user.role}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
