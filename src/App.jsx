import { useEffect, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

// Auth
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";

// Pages
import FarmerDashboard from "./pages/FarmerDashboard";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  const [session, setSession] = useState(null);
  const [authView, setAuthView] = useState("login");
  const [userRole, setUserRole] = useState("farmer");
  const [roleView, setRoleView] = useState("farmer");
  const [darkMode, setDarkMode] = useState(() => {
    return window.localStorage.getItem("theme") === "dark";
  });
  const [authError, setAuthError] = useState(null);

  // --- ADMIN ROLE DETECTION ---
  const determineRole = (user) => {
    if (!user) return "farmer";

    // Admin email allowlist from .env (VITE_ADMIN_EMAILS=email1,email2)
    const superAdmins = (import.meta.env.VITE_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const email = String(user.email || "").trim().toLowerCase();

    return superAdmins.includes(email) ? "admin" : "farmer";
  };

  // LOAD SESSION + USER ROLE
  useEffect(() => {
    const handleSession = async (currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        const role = determineRole(currentSession.user);
        setUserRole(role);
        // Set the correct dashboard view immediately.
        setRoleView(role === "admin" ? "admin" : "farmer");
      }
    };

    // 1. Check current session on load.
    supabase.auth.getSession().then(({ data }) => {
      handleSession(data.session);
    });

    // 2. Listen to auth state changes (Login/Logout).
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      handleSession(s);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Dark Mode Logic
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
    return () => {
      window.removeEventListener("weather-theme-change", handleWeatherTheme);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRoleView("farmer"); // Reset on logout.
  };

  // ============= PAGE: LOGIN =============
  if (!session) {
    return (
      <div className="app-container center">
        <div className="card login-card">
          <div className="login-header-band">
            <div>
              <div className="ameropa-title">AMEROPA</div>
            </div>
          </div>

          <div className="login-body">

            {authView === "register" ? (
              <>
                <RegisterForm />
                <div className="login-switch">
                  Already have an account? <button type="button" className="login-link" onClick={() => setAuthView("login")}>Login</button>
                </div>
              </>
            ) : (
              <>
                <LoginForm externalError={authError} onAuthError={setAuthError} onLogin={() => setAuthError(null)} />
                <div className="login-switch">
                  No active account? <button type="button" className="login-link" onClick={() => setAuthView("register")}>Sign up</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============= PAGE: DASHBOARD =============
  return (
    <div className="app-container dashboard-shell">
      <div className="dashboard-surface">
        <div className="top-bar">
          <div className="header-left">
            <div>
              <div className="ameropa-title">AMEROPA</div>
              <div style={{fontSize: '10px', opacity: 0.7}}>
                {userRole === "admin" ? "Admin account" : "Farmer account"}
              </div>
            </div>
          </div>

          <div className="top-actions">
            <button className="btn small outline" type="button" onClick={handleLogout}>
              Logout
            </button>

            <label className="theme-switch">
              <input type="checkbox" checked={darkMode} onChange={() => setDarkMode((prev) => !prev)} />
              <span className="theme-slider">
                <span className="theme-star theme-star-1"></span>
                <span className="theme-star theme-star-2"></span>
              </span>
            </label>
          </div>
        </div>

        <div className="surface-divider" />

        {userRole === "admin" ? (
          <div className="section"><AdminDashboard /></div>
        ) : (
          <div className="section"><FarmerDashboard /></div>
        )}
        
      </div>
    </div>
  );
}

export default App;
