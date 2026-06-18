import { useState } from "react";
import { apiFetch } from "../utils/api";

export default function Login({ onSwitch, onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const data = await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(form) });
      onLogin(data.access_token);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      {/* Left hero */}
      <div className="auth-hero">
        <div className="auth-hero-content animate-fadeUp">
          <div className="auth-hero-badge">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <circle cx="4" cy="4" r="4" fill="#818CF8"/>
            </svg>
            Trusted by 10,000+ professionals
          </div>
          <h1>Sign documents <span>with confidence</span></h1>
          <p>Enterprise-grade document signing with full audit trails, instant delivery, and legal compliance.</p>
          <div className="auth-stats">
            <div>
              <div className="auth-stat-num">99.9%</div>
              <div className="auth-stat-label">Uptime SLA</div>
            </div>
            <div>
              <div className="auth-stat-num">2M+</div>
              <div className="auth-stat-label">Docs signed</div>
            </div>
            <div>
              <div className="auth-stat-num">SOC 2</div>
              <div className="auth-stat-label">Certified</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="auth-form-side">
        <div className="auth-form-wrap animate-fadeUp">
          <div className="auth-logo">
            <div className="sidebar-logo-dot"></div>
            Doc<span>Sign</span>
          </div>
          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-sub">Sign in to manage your documents</p>

          {error && <div className="alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className="form-input" type="email" placeholder="you@company.com" required
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" required
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div style={{ marginTop: "1.5rem" }}>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? <span className="spinner"></span> : "Sign in"}
              </button>
            </div>
          </form>
          <p className="auth-switch">
            Don't have an account? <button onClick={onSwitch}>Create one free</button>
          </p>
        </div>
      </div>
    </div>
  );
}