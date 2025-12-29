import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function LoginForm({
  onLogin,
  role = "farmer",
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    const user = data?.user;
    const actualRole = user?.user_metadata?.role || "farmer";
    if (actualRole !== role) {
      setLoading(false);
      const message = `Nu ai autorizație să te autentifici ca ${roleLabel}. Selectează rolul corect și încearcă din nou.`;
      setError(message);
      onAuthError?.(message);
      await supabase.auth.signOut();
      return;
    }

    setLoading(false);
    onLogin?.();
  };

  const roleLabel = role === "admin" ? "Trader / Admin" : "Fermier";

  return (
    <form className="login-form" onSubmit={handleLogin}>
      <div className="small-text">
        Login ca <strong>{roleLabel}</strong>
      </div>

      <label className="label">
        Email
        <input
          className="input"
          type="email"
          placeholder={`Email ${roleLabel.toLowerCase()}`}
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
