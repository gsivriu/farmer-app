import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../hooks/useAuth";

const COLOR_RED = "#b01c2e";
const COLOR_RED_DARK = "#8e1624";
const COLOR_BG = "#eeebe5";
const COLOR_BORDER = "#d8d3cc";
const COLOR_INPUT_BG = "#f9f7f5";

const FONT_SANS = "'DM Sans', system-ui, -apple-system, sans-serif";
const FONT_SERIF = "'EB Garamond', Georgia, 'Times New Roman', serif";

function Field({ label, type = "text", placeholder, value, onChange, hint, autoFocus, autoComplete, required }) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === "password";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "#3d3a37", letterSpacing: ".01em" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          required={required}
          type={isPassword && showPw ? "text" : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            padding: isPassword ? "11px 44px 11px 14px" : "11px 14px",
            fontSize: 14.5,
            fontFamily: FONT_SANS,
            color: "#1e1a18",
            background: focused ? "#fff" : COLOR_INPUT_BG,
            border: `1.5px solid ${focused ? COLOR_RED : COLOR_BORDER}`,
            borderRadius: 9,
            outline: "none",
            transition: "border-color .15s, background .15s, box-shadow .15s",
            boxShadow: focused ? "0 0 0 3px rgba(176,28,46,.09)" : "none",
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw((p) => !p)}
            tabIndex={-1}
            aria-label={showPw ? "Ascunde parola" : "Arată parola"}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "#9a9490",
              lineHeight: 0,
            }}
          >
            {showPw ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
      {hint && <span style={{ fontSize: 12, color: "#9a9490", marginTop: 1 }}>{hint}</span>}
    </div>
  );
}

function PrimaryButton({ children, type = "button", disabled, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        padding: "13px",
        background: disabled ? "#c97581" : hovered ? COLOR_RED_DARK : COLOR_RED,
        color: "#fff",
        fontSize: 15,
        fontWeight: 600,
        fontFamily: FONT_SANS,
        letterSpacing: ".02em",
        border: "none",
        borderRadius: 9,
        cursor: disabled ? "default" : "pointer",
        transition: "background .15s, transform .1s",
        transform: hovered && !disabled ? "translateY(-1px)" : "none",
        boxShadow:
          hovered && !disabled
            ? "0 4px 16px rgba(176,28,46,.28)"
            : "0 2px 8px rgba(176,28,46,.18)",
      }}
    >
      {children}
    </button>
  );
}

function TextLink({ children, onClick, type = "button" }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: hovered ? COLOR_RED_DARK : COLOR_RED,
        fontSize: 13.5,
        fontWeight: 500,
        fontFamily: FONT_SANS,
        textDecoration: hovered ? "underline" : "none",
        padding: 0,
        transition: "color .12s",
      }}
    >
      {children}
    </button>
  );
}

function Logo() {
  return (
    <span
      style={{
        fontFamily: FONT_SERIF,
        fontSize: 28,
        fontWeight: 500,
        letterSpacing: "0.18em",
        color: COLOR_RED,
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      AMEROPA
    </span>
  );
}

function LoginView({ onGoForgot, onGoRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: "#1e1a18", letterSpacing: ".01em" }}>
          Autentificare platformă
        </h1>
        <p style={{ fontSize: 13.5, color: "#7a7570", marginTop: 5 }}>Bine ai revenit</p>
      </div>

      <Field
        label="Email"
        type="email"
        placeholder="adresa@exemplu.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        autoFocus
        required
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Field
          label="Parolă"
          type="password"
          placeholder="Minim 6 caractere"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <div style={{ textAlign: "right", marginTop: 2 }}>
          <TextLink onClick={onGoForgot}>Ai uitat parola?</TextLink>
        </div>
      </div>

      {error && (
        <div
          style={{
            fontSize: 13,
            color: COLOR_RED_DARK,
            background: "#fdf2f3",
            border: "1px solid #f3d1d1",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          {error}
        </div>
      )}

      <PrimaryButton type="submit" disabled={loading}>
        {loading ? "Se autentifică…" : "Autentificare"}
      </PrimaryButton>

      <div style={{ textAlign: "center", fontSize: 13.5, color: "#7a7570", marginTop: 4 }}>
        Acces prin invitație?{" "}
        <TextLink onClick={onGoRegister}>Detalii</TextLink>
      </div>
    </form>
  );
}

function ForgotView({ onGoLogin }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/set-password`,
    });
    setLoading(false);
    if (resetError) {
      setError("Nu am putut trimite emailul. Încearcă din nou.");
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#fdf2f3",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={COLOR_RED} strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "#1e1a18", marginBottom: 8 }}>Email trimis</h2>
          <p style={{ fontSize: 13.5, color: "#7a7570", lineHeight: 1.55, maxWidth: 260 }}>
            Dacă adresa <strong style={{ color: "#3d3a37" }}>{email}</strong> există în platformă, vei primi instrucțiunile de resetare.
          </p>
        </div>
        <TextLink onClick={onGoLogin}>← Înapoi la autentificare</TextLink>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ textAlign: "center", marginBottom: 2 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: "#1e1a18", letterSpacing: ".01em" }}>
          Resetare parolă
        </h1>
        <p style={{ fontSize: 13.5, color: "#7a7570", marginTop: 5, lineHeight: 1.5 }}>
          Introdu adresa email asociată contului tău
        </p>
      </div>

      <Field
        label="Email"
        type="email"
        placeholder="adresa@exemplu.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        autoFocus
        required
      />

      {error && (
        <div
          style={{
            fontSize: 13,
            color: COLOR_RED_DARK,
            background: "#fdf2f3",
            border: "1px solid #f3d1d1",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          {error}
        </div>
      )}

      <PrimaryButton type="submit" disabled={loading || !email}>
        {loading ? "Se trimite…" : "Trimite instrucțiuni"}
      </PrimaryButton>

      <div style={{ textAlign: "center" }}>
        <TextLink onClick={onGoLogin}>← Înapoi la autentificare</TextLink>
      </div>
    </form>
  );
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState("login");

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px max(16px, env(safe-area-inset-right)) 24px max(16px, env(safe-area-inset-left))",
        paddingTop: "max(24px, env(safe-area-inset-top))",
        paddingBottom: "max(24px, env(safe-area-inset-bottom))",
        background: COLOR_BG,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
        fontFamily: FONT_SANS,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 2px 4px rgba(0,0,0,.04), 0 16px 48px rgba(0,0,0,.10)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "28px 24px 24px",
            borderBottom: "1px solid #ede9e3",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Logo />
        </div>

        <div style={{ padding: "28px 24px 32px" }}>
          {view === "login" && (
            <LoginView
              onGoForgot={() => setView("forgot")}
              onGoRegister={() => navigate("/register")}
            />
          )}
          {view === "forgot" && <ForgotView onGoLogin={() => setView("login")} />}
        </div>
      </div>
    </div>
  );
}
