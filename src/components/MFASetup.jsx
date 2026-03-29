import { useState } from "react";
import { useMFA } from "../hooks/useMFA";
import { supabase } from "../supabaseClient";

export default function MFASetup({ onSuccess }) {
  const { enrollMFA, verifyEnrollment } = useMFA();
  const [step, setStep] = useState("idle");
  const [qrCode, setQrCode] = useState(null);
  const [uri, setUri] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await enrollMFA();
      setQrCode(result.qrCode);
      setUri(result.uri);
      setStep("scanning");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 10000)
      );
      await Promise.race([verifyEnrollment(code), timeout]);
      onSuccess();
    } catch (err) {
      const msg = err?.message ?? "";
      const isNetworkError =
        err?.message === "timeout" ||
        !navigator.onLine ||
        msg.toLowerCase().includes("fetch") ||
        msg.toLowerCase().includes("network");
      setError(
        isNetworkError
          ? "Eroare de rețea. Verifică conexiunea și încearcă din nou."
          : "Cod incorect. Încearcă din nou."
      );
    } finally {
      setLoading(false);
    }
  };

  if (step === "idle") {
    return (
      <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <h3>Activează autentificarea în doi pași</h3>
        <p className="small-text">
          Vei folosi o aplicație de autentificare (Google Authenticator, Authy etc.)
          pentru a genera coduri la fiecare login.
        </p>
        {error && <p className="badge rejected">{error}</p>}
        <button className="btn primary-btn full-width" onClick={handleStart} disabled={loading}>
          {loading ? "Se inițializează..." : "Continuă"}
        </button>
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button
            type="button"
            className="login-link"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onClick={async () => { await supabase.auth.signOut(); window.location.replace("/login"); }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h3>Scanează QR code-ul</h3>
      <p className="small-text">
        Deschide aplicația de autentificare și scanează codul de mai jos.
      </p>

      {uri && (
        <div style={{ textAlign: "center", margin: "1rem 0" }}>
          <a
            href={uri}
            className="btn primary-btn full-width"
            style={{ display: "block", marginBottom: "1rem" }}
          >
            Deschide în aplicația de autentificare
          </a>
        </div>
      )}

      {qrCode && (
        <details style={{ marginBottom: "1rem" }}>
          <summary className="small-text" style={{ cursor: "pointer", textAlign: "center" }}>
            Sau scanează QR code (desktop)
          </summary>
          <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
            <img src={qrCode} alt="QR code 2FA" style={{ width: 180, height: 180 }} />
          </div>
        </details>
      )}

      <form onSubmit={handleVerify} className="form">
        <div className="bid-input-container">
          <label className="bid-input-label">Cod de verificare (6 cifre)</label>
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
          {loading ? "Se verifică..." : "Activează 2FA"}
        </button>
      </form>
    </div>
  );
}
