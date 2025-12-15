import React, { useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";

export default function LoginPage() {
  const { login } = useAppContext();
  const [name, setName] = useState("");
  const [role, setRole] = useState("farmer"); // default user

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Introduceți un nume / o firmă.");
      return;
    }

    // Folosim login(name, role) din context
    login(name.trim(), role);
  };

  return (
    <div className="center">
      <div className="card login-card">
        {/* Banda roșie AMEROPA */}
        <div className="login-header-band">
          <h1 className="ameropa-title">AMEROPA</h1>
        </div>

        {/* Conținut card */}
        <div className="login-body">
          <h2 className="login-title">Ameropa Farmer Portal</h2>
          <p className="subtitle">
            Loghează-te ca fermier sau admin pentru a continua.
          </p>

          <form className="form login-form" onSubmit={handleSubmit}>
            {/* NUME */}
            <label className="label">
              Nume / Firmă
              <input
                className="input"
                type="text"
                placeholder="Ex: Ferma Popescu"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            {/* ROL */}
            <label className="label">
              Rol
              <select
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="farmer">Fermier</option>
                <option value="admin">Trader</option>
              </select>
            </label>

            {/* buton login */}
            <button className="btn primary-btn full-width" type="submit">
              Intră în aplicație
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
