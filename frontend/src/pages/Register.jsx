import { useState } from "react";
import { apiFetch } from "../utils/api";

export default function Register({ onSwitch, onLogin }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(form) });
      const data = await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email: form.email, password: form.password }) });
      onLogin(data.access_token);
    } catch (err) {
      // Make "already registered" errors actionable
      if (err.message?.toLowerCase().includes("already")) {
        setError("This email is already registered. Please sign in instead.");
      } else {
        setError(err.message);
      }
    }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="auth-hero-content animate-fadeUp">
          <div className="auth-hero-badge">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><circle cx="4" cy="4" r="4" fill="#818CF8"/></svg>
            Free to get started
          </div>
          <h1>The smarter way to <span>get signatures</span></h1>
          <p>Upload any PDF, place signature fields, and send — your signers get a link, you get a legally binding document.</p>
          <div className="auth-stats">
            <div><div className="auth-stat-num">&lt; 2min</div><div className="auth-stat-label">Time to first signature</div></div>
            <div><div className="auth-stat-num">256-bit</div><div className="auth-stat-label">AES Encryption</div></div>
          </div>
        </div>
      </div>
      <div className="auth-form-side">
        <div className="auth-form-wrap animate-fadeUp">
          <div className="auth-logo"><div className="sidebar-logo-dot"></div>Doc<span>Sign</span></div>
          <h2 className="auth-title">Create your account</h2>
          <p className="auth-sub">Start signing documents in minutes</p>

          {error && (
            <div className="alert-error">
              {error}
              {error.includes("already registered") && (
                <> <button onClick={onSwitch} style={{color:"#DC2626",fontWeight:700,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Sign in here</button></>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-input" type="text" placeholder="Aditya Chauhan" required
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Work email</label>
              <input className="form-input" type="email" placeholder="you@company.com" required
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Min. 8 characters" required minLength={8}
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div style={{ marginTop: "1.5rem" }}>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? <span className="spinner"></span> : "Create free account"}
              </button>
            </div>
          </form>
          <p className="auth-switch">Already have an account? <button onClick={onSwitch}>Sign in</button></p>
        </div>
      </div>
    </div>
  );
}