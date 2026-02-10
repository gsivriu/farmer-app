import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function RegisterForm({ onRegister, role = "farmer" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role, // farmer / admin in user_metadata
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      `${role === "admin" ? "Admin" : "Farmer"} account created. Check your email to confirm.`
    );
    onRegister?.();
  };

  const roleLabel = role === "admin" ? "Admin" : "Farmer";

  return (
    <form className="login-form" onSubmit={handleRegister}>
      <div className="small-text">
        New <strong>{roleLabel}</strong> account
      </div>

      <label className="label">
        Email
        <input
          className="input"
          type="email"
          placeholder={`${roleLabel.toLowerCase()} email`}
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

      {error && <p className="badge rejected">{error}</p>}
      {message && <p className="badge accepted">{message}</p>}

      <button
        className="btn outline full-width"
        type="submit"
        disabled={loading}
      >
        {loading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
