import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import "./App.css";
import { supabase } from "./supabaseClient";
import { useAuth } from "./hooks/useAuth";

import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import SetPassword from "./pages/SetPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import FarmerDashboard from "./pages/FarmerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import MFASetup from "./components/MFASetup";
import MFAVerify from "./components/MFAVerify";

// ─── Auth pages shell ────────────────────────────────────────────────────────
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

function LoginPage() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" replace />;
  return (
    <AuthShell>
      <LoginForm />
      <div className="login-switch">
        Acces prin invitație?{" "}
        <a className="login-link" href="/register">
          Detalii
        </a>
      </div>
    </AuthShell>
  );
}

function RegisterPage() {
  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}

// ─── Dashboard shell (după login) ────────────────────────────────────────────
function DashboardShell({ darkMode, setDarkMode }) {
  const { role, aalLevel, mfaEnrolled } = useAuth();

  // Trader fără 2FA enrollat → forțat la setup
  if (role === "admin" && !mfaEnrolled) {
    return <MFASetup onSuccess={() => window.location.reload()} />;
  }

  // Trader cu 2FA enrollat dar sesiune AAL1 → cerut cod TOTP
  if (role === "admin" && mfaEnrolled && aalLevel !== "aal2") {
    return <MFAVerify onSuccess={() => window.location.reload()} />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.replace("/login");
  };

  return (
    <div className="app-container dashboard-shell">
      <div className="dashboard-surface">
        <div className="top-bar">
          <div className="header-left">
            <div>
              <div className="ameropa-title">AMEROPA</div>
              <div style={{ fontSize: "10px", opacity: 0.7 }}>
                {role === "admin" ? "Admin account" : "Farmer account"}
              </div>
            </div>
          </div>

          <div className="top-actions">
            <button className="btn small outline" type="button" onClick={handleLogout}>
              Logout
            </button>
            <label className="theme-switch">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={() => setDarkMode((p) => !p)}
              />
              <span className="theme-slider">
                <span className="theme-star theme-star-1"></span>
                <span className="theme-star theme-star-2"></span>
              </span>
            </label>
          </div>
        </div>

        <div className="surface-divider" />

        {role === "admin" ? (
          <div className="section">
            <AdminDashboard />
          </div>
        ) : (
          <div className="section">
            <FarmerDashboard />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return window.localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("theme-dark");
      window.localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("theme-dark");
      window.localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  useEffect(() => {
    const handleWeatherTheme = (event) => {
      if (event?.detail && "isNight" in event.detail) {
        setDarkMode(Boolean(event.detail.isNight));
        return;
      }
      const stored = window.localStorage.getItem("theme");
      if (stored) setDarkMode(stored === "dark");
    };
    window.addEventListener("weather-theme-change", handleWeatherTheme);
    return () => window.removeEventListener("weather-theme-change", handleWeatherTheme);
  }, []);

  return (
    <>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardShell darkMode={darkMode} setDarkMode={setDarkMode} />
          </ProtectedRoute>
        }
      />
      {/* Rute admin-only: fermierii sunt redirectați la /dashboard */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/motherboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    <Analytics />
    </>
  );
}
