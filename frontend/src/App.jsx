import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    // Replace with your local port if different
    fetch("http://localhost:8080/")
      .then((res) => res.text())
      .then((data) => console.log("Backend says:", data))
      .catch((err) => console.error("CORS or Connection Error:", err));
  }, []);

  return <div>Check your Browser Console (F12)!</div>;
}
