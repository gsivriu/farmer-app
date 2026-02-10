import React, { useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";

export default function LoginPage() {
  const { login } = useAppContext();
  const [name, setName] = useState("");
  const [role, setRole] = useState("farmer"); // default user

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Enter a name / company.");
      return;
    }

    // Use login(name, role) from context.
    login(name.trim(), role);
  };

  return (
    <div className="center">
      <div className="card login-card">
        <div className="login-header-band">
          <h1 className="ameropa-title">AMEROPA</h1>
        </div>

        <div className="login-body">
          <h2 className="login-title">Ameropa Farmer Portal</h2>
          <p className="subtitle">
            Log in as farmer or admin to continue.
          </p>

          <form className="form login-form" onSubmit={handleSubmit}>
            <label className="label">
              Name / Company
              <input
                className="input"
                type="text"
                placeholder="e.g. Popescu Farm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="label">
              Role
              <select
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="farmer">Farmer</option>
                <option value="admin">Trader</option>
              </select>
            </label>

            <button className="btn primary-btn full-width" type="submit">
              Enter app
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
