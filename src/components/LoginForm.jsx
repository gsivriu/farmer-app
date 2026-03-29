import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function LoginForm({
  onLogin,
  role = "farmer", // Keep the prop to preserve App.jsx compatibility.
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
const msg = authError.message?.toLowerCase() ?? "";
      const code = authError.code ?? "";
      if (code === "user_banned" || msg.includes("ban") || msg.includes("disabled")) {
        setError("Contul tău a fost dezactivat. Contactează administratorul.");
      } else {
        setError("Email sau parolă incorectă.");
      }
      return;
    }

    setLoading(false);
    onLogin?.();
  };

  return (
    <form className="login-form" onSubmit={handleLogin}>
      <div className="small-text" style={{ textAlign: "center", marginBottom: "15px" }}>
        <strong>Platform sign in</strong>
      </div>

      <label className="label">
        Email
        <input
          className="input"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <label className="label">
        Password
        <input
          className="input"
          type="password"
          placeholder="Minimum 6 characters"
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
        {loading ? "Signing in..." : "Login"}
      </button>
    </form>
  );
}
