import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useMFA } from "../hooks/useMFA";
import MFASetup from "./MFASetup";

export default function MFASettings() {
  const { mfaEnrolled } = useAuth();
  const { unenrollMFA } = useMFA();
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUnenroll = async () => {
    setLoading(true);
    setError(null);
    try {
      await unenrollMFA();
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showSetup) {
    return <MFASetup onSuccess={() => window.location.reload()} />;
  }

  return (
    <div className="card">
      <h3>Autentificare în doi pași (2FA)</h3>
      <p className="small-text" style={{ marginBottom: "1rem" }}>
        Stare curentă:{" "}
        <span className={"badge " + (mfaEnrolled ? "accepted" : "rejected")}>
          {mfaEnrolled ? "Activat" : "Dezactivat"}
        </span>
      </p>
      {error && <p className="badge rejected">{error}</p>}
      {mfaEnrolled ? (
        <button className="btn outline" onClick={handleUnenroll} disabled={loading}>
          {loading ? "Se dezactivează..." : "Dezactivează 2FA"}
        </button>
      ) : (
        <button className="btn primary-btn" onClick={() => setShowSetup(true)}>
          Activează 2FA
        </button>
      )}
    </div>
  );
}
