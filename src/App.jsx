import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Auth
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";

// Pages
import FarmerDashboard from "./pages/FarmerDashboard";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  const [session, setSession] = useState(null);
  const [authRole, setAuthRole] = useState("farmer"); // rol ales pe login page
  const [userRole, setUserRole] = useState("farmer"); // rol stocat în Supabase
  const [roleView, setRoleView] = useState("farmer"); // tab-ul activ din dashboard

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

  // ============= PAGE: LOGIN =============
  if (!session) {
    const roleLabel = authRole === "farmer" ? "Fermier" : "Trader / Admin";

    return (
      <div className="app-container center">
        <div className="card login-card">
          {/* Banner AMEROPA */}
          <div className="login-header-band">
            <div>
              <div className="ameropa-title">AMEROPA</div>
              <p className="subtitle">Platformă digitală pentru fermieri & traderi</p>
            </div>
          </div>

          {/* LOGIN BODY */}
          <div className="login-body">
            {/* Toggle Fermier / Admin */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <h2 className="login-title">Login {roleLabel}</h2>

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
                  Trader / Admin
                </button>
              </div>
            </div>

            {/* Login + Register Grid */}
            <div className="grid">
              <div>
                <LoginForm role={authRole} />
              </div>
              <div>
                <RegisterForm role={authRole} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============= PAGE: DASHBOARD (LOGGED IN) =============
  return (
    <div className="app-container">
      {/* TOP BAR */}
      <div className="top-bar">
        <div className="header-left">
          <div>
            <div className="ameropa-title">AMEROPA</div>
            <p className="subtitle">Dashboard ofertare & prețuri pentru fermieri</p>
          </div>
        </div>

        {/* ROLE SWITCH */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            className={"btn small" + (roleView === "farmer" ? " primary-btn" : " outline")}
            onClick={() => setRoleView("farmer")}
          >
            Fermier
          </button>

          {/* DOAR ADMIN VEDE TAB-UL ADMIN */}
          {userRole === "admin" && (
            <button
              className={"btn small" + (roleView === "admin" ? " primary-btn" : " outline")}
              onClick={() => setRoleView("admin")}
            >
              Admin
            </button>
          )}

          <button className="btn small outline" onClick={() => supabase.auth.signOut()}>
            Logout
          </button>
        </div>
      </div>

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
  );
}

export default App;
