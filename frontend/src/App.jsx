import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function App() {
  const [token, setToken]   = useState(null);
  const [page, setPage]     = useState("login");
  const [checking, setChecking] = useState(true); // verify stored token on load

  // On mount — check if stored token is still valid
  useEffect(() => {
    const stored = localStorage.getItem("token");
    if (!stored) { setChecking(false); return; }

    // Ping /api/auth/me to validate token
    fetch(`${BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${stored}` } })
      .then(r => {
        if (r.ok) {
          setToken(stored);
          setPage("dashboard");
        } else {
          // Token expired or invalid — clear it silently
          localStorage.removeItem("token");
        }
      })
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = (accessToken) => {
    localStorage.setItem("token", accessToken);
    setToken(accessToken);
    setPage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setPage("login");
  };

  if (checking) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0A0F1E" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:"'Sora',sans-serif", fontSize:"1.5rem", fontWeight:800, color:"#F8F7FF", marginBottom:"1rem" }}>
          Doc<span style={{color:"#6366F1"}}>Sign</span>
        </div>
        <span className="spinner"></span>
      </div>
    </div>
  );

  if (page === "dashboard") return <Dashboard token={token} onLogout={handleLogout} />;
  if (page === "register")  return <Register  onSwitch={() => setPage("login")} onLogin={handleLogin} />;
  return <Login onSwitch={() => setPage("register")} onLogin={handleLogin} />;
}