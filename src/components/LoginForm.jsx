import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function LoginForm({
  onLogin,
  role = "farmer", // Păstrăm prop-ul ca să nu crape App.jsx, dar îl ignorăm vizual
  externalError,
  onAuthError,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    onAuthError?.(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setLoading(false);
      setError("Email sau parolă incorectă.");
      return;
    }

    setLoading(false);
    onLogin?.();
  };

  return (
    <form className="login-form" onSubmit={handleLogin}>
      {/* AICI AM SCHIMBAT: Text generic, să nu mai inducă în eroare */}
      <div className="small-text" style={{ textAlign: "center", marginBottom: "15px" }}>
        <strong>Autentificare în platformă</strong>
      </div>

      <label className="label">
        Email
        <input
          className="input"
          type="email"
          placeholder="Adresa de email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <label className="label">
        Parolă
        <input
          className="input"
          type="password"
          placeholder="Minim 6 caractere"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      {(error || externalError) && (
        <p className="badge rejected">{error || externalError}</p>
      )}

      <button
        className="btn primary-btn full-width"
        type="submit"
        disabled={loading}
      >
        {loading ? "Autentificare..." : "Login"}
      </button>
    </form>
  );
}