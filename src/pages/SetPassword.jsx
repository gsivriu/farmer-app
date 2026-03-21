import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

const PASSWORD_RULES = [
  { key: "min8",    label: "Minim 8 caractere",                          test: (p) => p.length >= 8 },
  { key: "upper",   label: "Cel puțin o literă mare (A-Z)",              test: (p) => /[A-Z]/.test(p) },
  { key: "digit",   label: "Cel puțin o cifră (0-9)",                    test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "Cel puțin un caracter special (!@#$%^&*-_=+)", test: (p) => /[!@#$%^&*\-_=+]/.test(p) },
];

function AuthShell({ children }) {
  return (
    <div className="app-container center">
      <div className="card login-card">
        <div className="login-header-band">
          <div className="ameropa-title">AMEROPA</div>
        </div>
        <div className="login-body">{children}</div>
      </div>
    </div>
  );
}

export function PasswordValidator({ password }) {
  if (!password) return null;
  return (
    <div style={{ margin: "8px 0 12px 0", fontSize: "12px" }}>
      {PASSWORD_RULES.map((r) => {
        const met = r.test(password);
        return (
          <div key={r.key} style={{ color: met ? "var(--green)" : "var(--red)", marginBottom: "3px" }}>
            {met ? "✓" : "✗"} {r.label}
          </div>
        );
      })}
    </div>
  );
}

export function allRulesMet(password) {
  return PASSWORD_RULES.every((r) => r.test(password));
}

export default function SetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [sessionReady, setSessionReady] = useState(false);
  const [tokenError, setTokenError] = useState(null);
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (token_hash && type) {
      supabase.auth.verifyOtp({ token_hash, type }).then(({ data, error: otpError }) => {
        if (otpError) {
          setTokenError("Link invalid sau expirat. Cere o nouă invitație.");
          return;
        }
        setEmail(data?.user?.email || "");
        setSessionReady(true);
      });
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          setEmail(data.session.user.email || "");
          setSessionReady(true);
        } else {
          setTokenError("Link invalid. Cere o nouă invitație.");
        }
      });
    }
  }, [searchParams]);

  const rulesStatus = PASSWORD_RULES.map((r) => ({ ...r, met: r.test(password) }));
  const valid = rulesStatus.every((r) => r.met) && password === confirm && confirm !== "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    navigate("/dashboard");
  };

  if (tokenError) {
    return (
      <AuthShell>
        <div className="login-form">
          <p className="badge rejected" style={{ textAlign: "center" }}>{tokenError}</p>
          <button className="btn outline full-width" type="button" onClick={() => navigate("/login")}>
            Înapoi la login
          </button>
        </div>
      </AuthShell>
    );
  }

  if (!sessionReady) {
    return (
      <AuthShell>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div className="small-text">Se verifică invitația...</div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="small-text" style={{ textAlign: "center", marginBottom: "6px" }}>
          <strong>Bun venit!</strong>
        </div>
        <p style={{ textAlign: "center", color: "var(--gray)", fontSize: "13px", margin: "0 0 18px 0" }}>
          Setează-ți parola pentru contul tău Ameropa Farmer App
        </p>

        {email && (
          <div className="label" style={{ marginBottom: "16px" }}>
            <span style={{ fontSize: "12px", color: "var(--gray)" }}>Cont</span>
            <div
              className="input"
              style={{ background: "var(--gray-light)", color: "var(--gray)", cursor: "default", userSelect: "all" }}
            >
              {email}
            </div>
          </div>
        )}

        <label className="label">
          Parolă nouă
          <div style={{ position: "relative" }}>
            <input
              className="input"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: "42px" }}
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              style={{
                position: "absolute", right: "10px", top: "50%",
                transform: "translateY(-50%)", background: "none",
                border: "none", cursor: "pointer", color: "var(--gray)", fontSize: "16px",
              }}
              aria-label={showPass ? "Ascunde parola" : "Arată parola"}
            >
              {showPass ? "🙈" : "👁"}
            </button>
          </div>
        </label>

        <PasswordValidator password={password} />

        <label className="label">
          Confirmă parola
          <div style={{ position: "relative" }}>
            <input
              className="input"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              style={{ paddingRight: "42px" }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((p) => !p)}
              style={{
                position: "absolute", right: "10px", top: "50%",
                transform: "translateY(-50%)", background: "none",
                border: "none", cursor: "pointer", color: "var(--gray)", fontSize: "16px",
              }}
              aria-label={showConfirm ? "Ascunde parola" : "Arată parola"}
            >
              {showConfirm ? "🙈" : "👁"}
            </button>
          </div>
        </label>

        {confirm && password !== confirm && (
          <p style={{ color: "var(--red)", fontSize: "12px", margin: "4px 0 8px" }}>
            Parolele nu coincid.
          </p>
        )}

        {error && <p className="badge rejected">{error}</p>}

        <button
          className="btn primary-btn full-width"
          type="submit"
          disabled={!valid || loading}
          style={{ marginTop: "16px" }}
        >
          {loading ? "Se salvează..." : "Setează parola"}
        </button>
      </form>
    </AuthShell>
  );
}
