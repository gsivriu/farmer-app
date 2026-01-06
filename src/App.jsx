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
  const [authRole, setAuthRole] = useState("farmer"); // rol ales pe login page
  const [userRole, setUserRole] = useState("farmer"); // rol stocat în Supabase
  const [roleView, setRoleView] = useState("farmer"); // tab-ul activ din dashboard
  const [darkMode, setDarkMode] = useState(() => {
    return window.localStorage.getItem("theme") === "dark";
  });
  const [authError, setAuthError] = useState(null);

  // LOAD SESSION + USER ROLE
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      const s = data.session;
      setSession(s);

      if (s?.user) {
        const role = s.user.user_metadata?.role || "farmer";
        setUserRole(role);
        setRoleView(role === "admin" ? "admin" : "farmer");
      }
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        const role = s.user.user_metadata?.role || "farmer";
        setUserRole(role);
        setRoleView(role === "admin" ? "admin" : "farmer");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    console.log("🔗 Supabase URL:", import.meta.env.VITE_SUPABASE_URL);

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("❌ Eroare conexiune Supabase:", error);
      } else {
        console.log("✅ Conexiune Supabase reușită!", data);
      }
    });
  }, []);

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
    setAuthError(null);
  }, [authRole]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error && error.message !== "Auth session missing!") {
      window.alert("Eroare la logout: " + error.message);
      return;
    }
    setSession(null);
  };


  // ============= PAGE: LOGIN =============
  if (!session) {
    return (
      <div className="app-container center">
        <div className="card login-card">
          {/* Banner AMEROPA */}
          <div className="login-header-band">
            <div>
              <div className="ameropa-title">AMEROPA</div>
                          </div>
          </div>

          {/* LOGIN BODY */}
          <div className="login-body">
            {/* Toggle Fermier / Admin */}
            <div
              className="login-role-row"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "10px",
                marginBottom: "10px",
              }}
            >

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  className={"btn small" + (authRole === "farmer" ? " primary-btn" : " outline")}
                  type="button"
                  onClick={() => setAuthRole("farmer")}
                >
                  Fermier
                </button>

                <button
                  className={"btn small" + (authRole === "admin" ? " primary-btn" : " outline")}
                  type="button"
                  onClick={() => setAuthRole("admin")}
                >
                  Admin
                </button>
              </div>
            </div>

            {/* Login + Register Grid */}
            {authView === "register" ? (
              <>
                <RegisterForm role={authRole} />
                <div className="login-switch">
                  Ai deja un cont?{" "}
                  <button
                    type="button"
                    className="login-link"
                    onClick={() => setAuthView("login")}
                  >
                    Login
                  </button>
                </div>
              </>
            ) : (
              <>
                <LoginForm
                  role={authRole}
                  externalError={authError}
                  onAuthError={setAuthError}
                  onLogin={() => setAuthError(null)}
                />
                <div className="login-switch">
                  Nu ai un cont activ?{" "}
                  <button
                    type="button"
                    className="login-link"
                    onClick={() => setAuthView("register")}
                  >
                    Inregistreaza-te
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============= PAGE: DASHBOARD (LOGGED IN) =============
  return (
    <div className="app-container dashboard-shell">
      <div className="dashboard-surface">
        {/* TOP BAR */}
        <div className="top-bar">
          <div className="header-left">
            <div>
              <div className="ameropa-title">AMEROPA</div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="top-actions">
            <button className="btn small outline" type="button" onClick={handleLogout}>
              Logout
            </button>

            <label className="theme-switch" aria-label="Toggle dark mode">
              <input
                id="theme-switch"
                type="checkbox"
                checked={darkMode}
                onChange={() => setDarkMode((prev) => !prev)}
                aria-label="Toggle dark mode"
              />
              <span className="theme-slider">
                <span className="theme-star theme-star-1"></span>
                <span className="theme-star theme-star-2"></span>
                <span className="theme-star theme-star-3"></span>
                <svg viewBox="0 0 16 16" className="theme-cloud" aria-hidden="true">
                  <path
                    transform="matrix(.77976 0 0 .78395-299.99-418.63)"
                    fill="#fff"
                    d="m391.84 540.91c-.421-.329-.949-.524-1.523-.524-1.351 0-2.451 1.084-2.485 2.435-1.395.526-2.388 1.88-2.388 3.466 0 1.874 1.385 3.423 3.182 3.667v.034h12.73v-.006c1.775-.104 3.182-1.584 3.182-3.395 0-1.747-1.309-3.186-2.994-3.379.007-.106.011-.214.011-.322 0-2.707-2.271-4.901-5.072-4.901-2.073 0-3.856 1.202-4.643 2.925"
                  ></path>
                </svg>
              </span>
            </label>
          </div>
        </div>

        <div className="surface-divider" />

        {/* CONTENT BY ROLE */}
        {roleView === "farmer" && (
          <div className="section">
            <FarmerDashboard />
          </div>
        )}

        {roleView === "admin" && (
          <div className="section">
            <AdminDashboard />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
