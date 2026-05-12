import { useEffect, useState } from "react";

export default function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    address: "",
    lot_number: "",
  });

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  // 1. Load the directory on startup
  useEffect(() => {
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
  }, [API_URL]);

  // 2. Handle the form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to register resident");

      const newUser = await res.json();

      // Update the list immediately without needing a refresh
      setUsers((prevUsers) => [...prevUsers, newUser]);

      // Clear the form
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        address: "",
        lot_number: "",
      });
      alert("Resident registered successfully!");
    } catch (err) {
      alert(err.message);
    }
  };

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

      {/* --- REGISTRATION FORM --- */}
      <section
        style={{
          marginBottom: "40px",
          background: "#f9f9f9",
          padding: "20px",
          borderRadius: "8px",
        }}
      >
        <h3>Register New Resident</h3>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "10px" }}
        >
          <input
            placeholder="First Name"
            value={formData.first_name}
            onChange={(e) =>
              setFormData({ ...formData, first_name: e.target.value })
            }
            required
          />
          <input
            placeholder="Last Name"
            value={formData.last_name}
            onChange={(e) =>
              setFormData({ ...formData, last_name: e.target.value })
            }
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />
          <button
            type="submit"
            style={{
              cursor: "pointer",
              background: "#007bff",
              color: "white",
              border: "none",
              padding: "10px",
              borderRadius: "4px",
            }}
          >
            Add Resident
          </button>
        </form>
      </section>

      {/* --- RESIDENT DIRECTORY --- */}
      <h2>Resident Directory</h2>
      {loading && <p>Searching the records...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

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
