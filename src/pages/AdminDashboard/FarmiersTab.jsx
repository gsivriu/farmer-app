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
    <span className={active ? "farmers-badge-active" : "farmers-badge-inactive"}>
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
    <div className="farmers-page">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* ── INVITAȚIE ─────────────────────────────────────── */}
      <section className="farmers-invite">
        <h3 className="farmers-section-eyebrow">Invită fermier nou</h3>
        <form onSubmit={handleInvite}>
          <div className="farmers-form-grid">
            <label className="farmers-form-group farmers-form-full">
              <span className="farmers-form-label">Email *</span>
              <input
                className="farmers-input"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="fermier@example.com"
                required
              />
            </label>
            <label className="farmers-form-group farmers-form-full">
              <span className="farmers-form-label">Nume complet *</span>
              <input
                className="farmers-input"
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Ion Ionescu"
                required
              />
            </label>
            <label className="farmers-form-group">
              <span className="farmers-form-label">Județ</span>
              <select
                className="farmers-input farmers-select"
                value={inviteJudet}
                onChange={(e) => setInviteJudet(e.target.value)}
              >
                <option value="">— selectează —</option>
                {JUDETE.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </label>
            <label className="farmers-form-group">
              <span className="farmers-form-label">Telefon</span>
              <input
                className="farmers-input"
                type="tel"
                value={inviteTelefon}
                onChange={(e) => setInviteTelefon(e.target.value)}
                placeholder="07xx xxx xxx"
              />
            </label>
          </div>
          <button
            className="farmers-invite-btn"
            type="submit"
            disabled={inviteLoading}
          >
            {inviteLoading ? "Se trimite..." : "Trimite invitație"}
          </button>
        </form>
      </section>

      {/* ── LISTA FERMIERILOR ──────────────────────────────── */}
      <section className="farmers-list">
        <div className="farmers-list-header">
          <h3 className="farmers-list-title">
            Fermieri înregistrați
            {!loadingList && (
              <span className="farmers-list-count">({filtered.length})</span>
            )}
          </h3>
          <input
            className="farmers-search"
            type="text"
            placeholder="Caută după nume sau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loadingList ? (
          <div className="farmers-empty">Se încarcă...</div>
        ) : filtered.length === 0 ? (
          <div className="farmers-empty">
            {search ? "Niciun rezultat." : "Nu există fermieri înregistrați."}
          </div>
        ) : (
          <div className="farmers-table-wrap">
            <table className="farmers-table">
              <thead>
                <tr>
                  {["Nume complet", "Email", "Telefon", "Județ", "Status", "Data înregistrării", "Acțiuni"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id}>
                    <td className="farmers-td-primary">{f.full_name || "—"}</td>
                    <td className="farmers-td-primary">{f.email}</td>
                    <td className={f.telefon ? "farmers-td-secondary" : "farmers-td-empty"}>{f.telefon || "—"}</td>
                    <td className={f.judet ? "farmers-td-secondary" : "farmers-td-empty"}>{f.judet || "—"}</td>
                    <td><StatusBadge status={f.status} /></td>
                    <td className="farmers-td-secondary farmers-td-nowrap">{formatDate(f.created_at)}</td>
                    <td>
                      <button
                        className="farmers-toggle-btn"
                        type="button"
                        onClick={() => toggleStatus(f)}
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
