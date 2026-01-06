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
          role, // fermier / admin în user_metadata
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      `Cont de ${role === "admin" ? "admin" : "fermier"} creat. Verifică email-ul pentru confirmare.`
    );
    onRegister?.();
  };

  const roleLabel = role === "admin" ? "Admin" : "Fermier";

  return (
    <form className="login-form" onSubmit={handleRegister}>
      <div className="small-text">
        Cont nou <strong>{roleLabel}</strong>
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

      {error && <p className="badge rejected">{error}</p>}
      {message && <p className="badge accepted">{message}</p>}

      <button
        className="btn outline full-width"
        type="submit"
        disabled={loading}
      >
        {loading ? "Creare cont..." : "Creează cont"}
      </button>
    </form>
  );
}
