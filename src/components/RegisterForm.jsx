import { useNavigate } from "react-router-dom";

export default function RegisterForm() {
  const navigate = useNavigate();

  return (
    <div className="login-form">
      <div className="small-text" style={{ textAlign: "center", marginBottom: "16px" }}>
        <strong>Acces prin invitație</strong>
      </div>
      <p
        style={{
          textAlign: "center",
          color: "var(--gray)",
          fontSize: "14px",
          lineHeight: "1.6",
          margin: "0 0 28px 0",
        }}
      >
        Accesul în aplicație se face prin invitație din partea unui trader Ameropa.
        Dacă ești fermier Ameropa și nu ai primit invitația, contactează trader-ul tău.
      </p>
      <button
        className="btn outline full-width"
        type="button"
        onClick={() => navigate("/login")}
      >
        Înapoi la login
      </button>
    </div>
  );
}
