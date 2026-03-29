import { useState } from "react";
import { useMFA } from "../hooks/useMFA";
import { supabase } from "../supabaseClient";

export default function MFAVerify({ onSuccess }) {
  const { challengeAndVerify } = useMFA();
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await challengeAndVerify(code);
      onSuccess();
    } catch {
      setError("Cod incorect. Încearcă din nou.");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.replace("/login");
  };

  return (
    <div className="app-container center">
      <div className="card login-card">
        <div className="login-header-band">
          <div className="ameropa-title">AMEROPA</div>
        </div>
        <div className="login-body">
          <h2 style={{ marginBottom: "0.5rem" }}>Verificare în doi pași</h2>
          <p className="small-text" style={{ marginBottom: "1.5rem" }}>
            Introdu codul din aplicația de autentificare.
          </p>

          <form onSubmit={handleVerify} className="form">
            <div className="bid-input-container">
              <input
                className="bid-input-field"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                autoFocus
              />
            </div>
            {error && <p className="badge rejected">{error}</p>}
            <button
              className="btn primary-btn full-width"
              type="submit"
              disabled={loading || code.length !== 6}
            >
              {loading ? "Se verifică..." : "Verifică"}
            </button>
          </form>

          <div className="login-switch" style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="login-link"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
