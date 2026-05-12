import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    // This looks for the Vercel variable first, and falls back to localhost for dev
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

    fetch(API_URL)
      .then((res) => res.text())
      .then((data) => console.log("Backend says:", data))
      .catch((err) => console.error("CORS or Connection Error:", err));
  }, []);

  return <div>Check your Browser Console (F12)!</div>;
}
