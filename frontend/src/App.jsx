import { useState } from "react";
import Landing from "./pages/Landing/Landing";
// We will import Dashboard here later

export default function App() {
  // This state will track if a resident is "logged in"
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    // For now, this just toggles the view.
    // Later, this will be triggered by Google/Facebook success.
    setIsLoggedIn(true);
  };

  return (
    <div className="app-container">
      {isLoggedIn ? (
        <div>
          <h1>Resident Portal Dashboard</h1>
          <button onClick={() => setIsLoggedIn(false)}>Logout</button>
          {/* We will build the Dashboard component next */}
        </div>
      ) : (
        <Landing onLogin={handleLogin} />
      )}
    </div>
  );
}
