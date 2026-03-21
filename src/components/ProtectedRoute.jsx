import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function LoadingScreen() {
  return (
    <div className="app-container center">
      <div className="card login-card">
        <div className="login-header-band">
          <div className="ameropa-title">AMEROPA</div>
        </div>
        <div className="login-body" style={{ textAlign: "center", padding: "2rem" }}>
          <div className="small-text">Se încarcă...</div>
        </div>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, role, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/dashboard" replace />;
  return children;
}
