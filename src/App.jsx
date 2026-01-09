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
  const [authRole, setAuthRole] = useState("farmer"); 
  const [userRole, setUserRole] = useState("farmer"); 
  const [roleView, setRoleView] = useState("farmer"); 
  const [darkMode, setDarkMode] = useState(() => {
    return window.localStorage.getItem("theme") === "dark";
  });
  const [authError, setAuthError] = useState(null);

  // --- LOGICA DETECTARE ADMIN ---
  const determineRole = (user) => {
    if (!user) return "farmer";
    
    // 1. Lista de Admini (scrie exact cu litere mici)
    const superAdmins = [
      "gsivriu@gmail.com", 
      "admin1@test.com"
    ];

    // 2. Curățăm emailul userului (fără spații, litere mici)
    const email = String(user.email || "").trim().toLowerCase();

    console.log("🔍 Verificare Rol pentru:", email); // DEBUG

    if (superAdmins.includes(email)) {
      console.log("✅ ESTE ADMIN!"); // DEBUG
      return "admin";
    }

    console.log("❌ Este doar Fermier."); // DEBUG
    return "farmer";
  };

  // LOAD SESSION + USER ROLE
  useEffect(() => {
    const handleSession = async (currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        const role = determineRole(currentSession.user);
        setUserRole(role);
        // Forțăm view-ul corect imediat
        setRoleView(role === "admin" ? "admin" : "farmer");
      }
    };

    // 1. Verificăm sesiunea curentă la încărcare
    supabase.auth.getSession().then(({ data }) => {
      handleSession(data.session);
    });

    // 2. Ascultăm schimbările (Login/Logout)
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
      if (!event?.detail) return;
      setDarkMode(Boolean(event.detail.isNight));
    };

    window.addEventListener("weather-theme-change", handleWeatherTheme);
    return () => {
      window.removeEventListener("weather-theme-change", handleWeatherTheme);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRoleView("farmer"); // Reset la logout
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
            
            {/* AM SCOS BUTOANELE DE AICI PENTRU LOGIN - ROLUL E AUTOMAT */}
            {/* Le afișăm doar la Înregistrare dacă vrei să lași userul să aleagă (opțional) */}
            
            {authView === "register" && (
              <div className="login-role-row" style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "10px" }}>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button className={"btn small" + (authRole === "farmer" ? " primary-btn" : " outline")} type="button" onClick={() => setAuthRole("farmer")}>Fermier</button>
                  <button className={"btn small" + (authRole === "admin" ? " primary-btn" : " outline")} type="button" onClick={() => setAuthRole("admin")}>Admin</button>
                </div>
              </div>
            )}

            {authView === "register" ? (
              <>
                <RegisterForm role={authRole} />
                <div className="login-switch">
                  Ai deja un cont? <button type="button" className="login-link" onClick={() => setAuthView("login")}>Login</button>
                </div>
              </>
            ) : (
              <>
                {/* La Login nu mai pasăm "role" că nu contează butonul, contează emailul */}
                <LoginForm externalError={authError} onAuthError={setAuthError} onLogin={() => setAuthError(null)} />
                <div className="login-switch">
                  Nu ai un cont activ? <button type="button" className="login-link" onClick={() => setAuthView("register")}>Inregistreaza-te</button>
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
              {/* Debug vizual mic sub titlu ca să fii sigur */}
              <div style={{fontSize: '10px', opacity: 0.7}}>
                {userRole === 'admin' ? 'Cont Admin' : 'Cont Fermier'}
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

        {/* LOGICA STRICTĂ DE AFIȘARE */}
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
