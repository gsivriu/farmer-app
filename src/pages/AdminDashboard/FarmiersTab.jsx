import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { PasswordValidator, allRulesMet } from "../SetPassword";

const JUDETE = [
  "Alba","Arad","Argeș","Bacău","Bihor","Bistrița-Năsăud","Botoșani",
  "Brăila","Brașov","București","Buzău","Călărași","Caraș-Severin",
  "Cluj","Constanța","Covasna","Dâmbovița","Dolj","Galați","Giurgiu",
  "Gorj","Harghita","Hunedoara","Ialomița","Iași","Ilfov","Maramureș",
  "Mehedinți","Mureș","Neamț","Olt","Prahova","Sălaj","Satu Mare",
  "Sibiu","Suceava","Teleorman","Timiș","Tulcea","Vâlcea","Vaslui","Vrancea",
];

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;
  return (
    <div
      style={{
        position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
        zIndex: 1000, padding: "12px 20px", borderRadius: "10px", fontSize: "14px",
        fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        background: toast.type === "success" ? "var(--green)" : "var(--red)",
        color: "#fff", maxWidth: "90vw", textAlign: "center",
      }}
    >
      {toast.message}
    </div>
  );
}

function StatusBadge({ status }) {
  const active = status === "active";
  return (
    <span
      style={{
        display: "inline-block", padding: "2px 10px", borderRadius: "999px",
        fontSize: "12px", fontWeight: 600,
        background: active ? "rgba(16,185,129,0.15)" : "rgba(185,16,30,0.12)",
        color: active ? "var(--green)" : "var(--red)",
      }}
    >
      {active ? "Activ" : "Dezactivat"}
    </span>
  );
}

export default function FarmiersTab() {
  const [farmers, setFarmers] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteJudet, setInviteJudet] = useState("");
  const [inviteTelefon, setInviteTelefon] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const showToast = (message, type = "success") => setToast({ message, type });

  const fetchFarmers = useCallback(async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, telefon, judet, status, created_at")
      .eq("role", "farmer")
      .order("created_at", { ascending: false });

    if (!error) setFarmers(data || []);
    setLoadingList(false);
  }, []);

  useEffect(() => {
    fetchFarmers();
  }, [fetchFarmers]);

  const toggleStatus = async (farmer) => {
    const newStatus = farmer.status === "active" ? "disabled" : "active";
    const { error } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", farmer.id);

    if (error) {
      showToast("Eroare la actualizarea statusului.", "error");
      return;
    }
    showToast(
      newStatus === "disabled"
        ? `${farmer.email} a fost dezactivat.`
        : `${farmer.email} a fost activat.`,
      "success"
    );
    fetchFarmers();
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteLoading(true);

    const { data, error } = await supabase.functions.invoke("invite-farmer", {
      body: {
        email: inviteEmail.trim(),
        full_name: inviteName.trim(),
        judet: inviteJudet || null,
        telefon: inviteTelefon.trim() || null,
      },
    });

    setInviteLoading(false);

    // Extragem mesajul real de eroare din response body (non-2xx)
    if (error) {
      let msg = "Eroare la trimiterea invitației.";
      try {
        const body = await error.context?.json?.();
        if (body?.error) msg = body.error;
      } catch { /* ignore */ }
      showToast(msg, "error");
      return;
    }

    if (data?.error) {
      showToast(data.error, "error");
      return;
    }

    showToast(`Invitație trimisă către ${inviteEmail}.`, "success");
    setInviteEmail("");
    setInviteName("");
    setInviteJudet("");
    setInviteTelefon("");
    fetchFarmers();
  };

  const filtered = farmers.filter((f) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (f.full_name || "").toLowerCase().includes(q) ||
      (f.email || "").toLowerCase().includes(q)
    );
  });

  const formatDate = (val) => {
    if (!val) return "-";
    return new Date(val).toLocaleDateString("ro-RO", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  };

  return (
    <div style={{ padding: "0 0 40px" }}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* ── B) INVITAȚIE ─────────────────────────────────────── */}
      <section style={{ marginBottom: "32px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "14px", opacity: 0.85 }}>
          Invită fermier nou
        </h3>
        <form onSubmit={handleInvite}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <label className="label" style={{ gridColumn: "1 / -1" }}>
              Email *
              <input
                className="input"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="fermier@example.com"
                required
              />
            </label>
            <label className="label" style={{ gridColumn: "1 / -1" }}>
              Nume complet *
              <input
                className="input"
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Ion Ionescu"
                required
              />
            </label>
            <label className="label">
              Județ
              <select
                className="input"
                value={inviteJudet}
                onChange={(e) => setInviteJudet(e.target.value)}
              >
                <option value="">— selectează —</option>
                {JUDETE.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </label>
            <label className="label">
              Telefon
              <input
                className="input"
                type="tel"
                value={inviteTelefon}
                onChange={(e) => setInviteTelefon(e.target.value)}
                placeholder="07xx xxx xxx"
              />
            </label>
          </div>
          <button
            className="btn primary-btn"
            type="submit"
            disabled={inviteLoading}
            style={{ marginTop: "14px", minWidth: "180px" }}
          >
            {inviteLoading ? "Se trimite..." : "Trimite invitație"}
          </button>
        </form>
      </section>

      <div className="surface-divider" style={{ margin: "0 0 24px" }} />

      {/* ── A) LISTA FERMIERILOR ──────────────────────────────── */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, opacity: 0.85, flex: "1 1 auto" }}>
            Fermieri înregistrați
            {!loadingList && (
              <span style={{ fontWeight: 400, opacity: 0.5, fontSize: "13px", marginLeft: "8px" }}>
                ({filtered.length})
              </span>
            )}
          </h3>
          <input
            className="input"
            type="text"
            placeholder="Caută după nume sau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: "260px", flex: "0 0 auto" }}
          />
        </div>

        {loadingList ? (
          <div style={{ textAlign: "center", padding: "2rem", opacity: 0.5 }}>Se încarcă...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", opacity: 0.5 }}>
            {search ? "Niciun rezultat." : "Nu există fermieri înregistrați."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--gray-light)", textAlign: "left" }}>
                  {["Nume complet", "Email", "Telefon", "Județ", "Status", "Data înregistrării", "Acțiuni"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", fontWeight: 600, opacity: 0.7, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr
                    key={f.id}
                    style={{ borderBottom: "1px solid var(--gray-light)" }}
                  >
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{f.full_name || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>{f.email}</td>
                    <td style={{ padding: "10px 12px" }}>{f.telefon || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>{f.judet || "—"}</td>
                    <td style={{ padding: "10px 12px" }}><StatusBadge status={f.status} /></td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{formatDate(f.created_at)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <button
                        className={`btn small ${f.status === "active" ? "outline" : "primary-btn"}`}
                        type="button"
                        onClick={() => toggleStatus(f)}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {f.status === "active" ? "Dezactivează" : "Activează"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
