import { useState } from "react";

// ── SVG icons ──────────────────────────────────────────────────────────────

function IconSilo() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="4" height="8" rx="0.5" />
      <rect x="8" y="4" width="4" height="8" rx="0.5" />
      <path d="M2 4 C2 2.5 6 2.5 6 4" />
      <path d="M8 4 C8 2.5 12 2.5 12 4" />
    </svg>
  );
}

function IconWarehouse() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6L7 2l6 4v6H1V6z" />
      <rect x="5" y="8" width="4" height="4" />
    </svg>
  );
}

function IconTruck() {
  return (
    <svg viewBox="0 0 20 14" fill="none" stroke="#374151" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="11" height="8" rx="1" />
      <path d="M12 6h4l2 3v2h-6V6z" />
      <circle cx="5" cy="12" r="1.5" fill="#374151" stroke="none" />
      <circle cx="15" cy="12" r="1.5" fill="#374151" stroke="none" />
    </svg>
  );
}

function IconTrain() {
  return (
    <svg viewBox="0 0 22 14" fill="none" stroke="#374151" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="6" height="9" rx="1" />
      <rect x="8" y="2" width="6" height="9" rx="1" />
      <rect x="15" y="2" width="6" height="9" rx="1" />
      <line x1="1" y1="7" x2="21" y2="7" />
      <circle cx="3.5" cy="12.5" r="1.5" fill="#374151" stroke="none" />
      <circle cx="8.5" cy="12.5" r="1.5" fill="#374151" stroke="none" />
      <circle cx="13.5" cy="12.5" r="1.5" fill="#374151" stroke="none" />
      <circle cx="18.5" cy="12.5" r="1.5" fill="#374151" stroke="none" />
    </svg>
  );
}

function IconBarge() {
  return (
    <svg viewBox="0 0 22 14" fill="none" stroke="#374151" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="14" height="6" rx="1" />
      <path d="M7 4V2h8v2" />
      <path d="M1 11 Q5.5 9 11 11 Q16.5 13 21 11" />
    </svg>
  );
}

function IconCart() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1" />
      <circle cx="11" cy="12" r="1" />
      <path d="M1 1h2l1.5 7h7L13 4H4" />
    </svg>
  );
}

// ── Commodity badge ─────────────────────────────────────────────────────────

const BADGE_MAP = {
  "Grâu":       "mb-badge mb-badge-wheat",
  "Porumb":     "mb-badge mb-badge-corn",
  "Floarea S.": "mb-badge mb-badge-sun",
  "Rapiță":     "mb-badge mb-badge-rape",
  "Orz":        "mb-badge mb-badge-barley",
};

function CommodityBadge({ name }) {
  return <span className={BADGE_MAP[name] || "mb-badge"}>{name}</span>;
}

// ── Fill bar ────────────────────────────────────────────────────────────────

function FillBar({ pct }) {
  const color = pct > 90 ? "#b9101e" : pct >= 60 ? "#eab308" : "#10b981";
  return (
    <div className="mb-fill-bar" style={{ minWidth: 48 }}>
      <div className="mb-fill-inner" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Transport chip ──────────────────────────────────────────────────────────

function TransportChip({ status }) {
  const cls =
    status === "Tranzit" ? "mb-chip mb-chip-transit" :
    status === "Avizare" ? "mb-chip mb-chip-wait" :
    "mb-chip mb-chip-done";
  return <span className={cls}>{status}</span>;
}

// ── Transport progress bar ───────────────────────────────────────────────────

function TransportBar({ pct, status, type }) {
  const fillColor =
    status === "Tranzit" ? "#1d4ed8" :
    status === "Avizare" ? "#92400e" :
    "#166534";

  const VehicleIcon = type === "tren" ? IconTrain : type === "barja" ? IconBarge : IconTruck;

  return (
    <div className="mb-tr-bar-outer">
      <div className="mb-tr-bar-fill" style={{ width: `${pct}%`, background: fillColor }} />
      <div className="mb-tr-vehicle" style={{ left: `${Math.min(Math.max(pct, 4), 96)}%` }}>
        <VehicleIcon />
      </div>
    </div>
  );
}

// ── Delta cell ───────────────────────────────────────────────────────────────

function Delta({ val }) {
  if (val > 0) return <span style={{ color: "#10b981", fontWeight: 600 }}>▲ +{val}€</span>;
  if (val < 0) return <span style={{ color: "#b9101e", fontWeight: 600 }}>▼ {val}€</span>;
  return <span style={{ color: "#6b7280" }}>— 0€</span>;
}

// ── Data ─────────────────────────────────────────────────────────────────────

const CHIMPEX_DATA = [
  { id: "C-01 Est",    commodity: "Grâu",       stock: 28400, cap: 30000 },
  { id: "C-02 Vest",   commodity: "Porumb",     stock: 32100, cap: 40000 },
  { id: "C-03 Nord",   commodity: "Floarea S.", stock: 19600, cap: 20000 },
  { id: "C-04 Sud",    commodity: "Rapiță",     stock: 12300, cap: 22000 },
  { id: "C-05 Centru", commodity: "Orz",        stock:  9800, cap: 15000 },
  { id: "C-06 Est 2",  commodity: "Grâu",       stock: 10100, cap: 20000 },
];

const INLAND_DATA = [
  { silo: "Slobozia",   judet: "Ialomița",   commodity: "Grâu",       stock: 18200, cap: 25000 },
  { silo: "Călărași",   judet: "Călărași",   commodity: "Porumb",     stock: 22500, cap: 30000 },
  { silo: "Brăila",     judet: "Brăila",     commodity: "Floarea S.", stock: 11800, cap: 20000 },
  { silo: "Alexandria", judet: "Teleorman",  commodity: "Rapiță",     stock: 21500, cap: 40000 },
  { silo: "Galați",     judet: "Galați",     commodity: "Orz",        stock:  6400, cap: 15000 },
  { silo: "Buzău",      judet: "Buzău",      commodity: "Grâu",       stock: 13400, cap: 20000 },
];

const TRANSPORT_DATA = [
  { id: "TRN-2241", type: "tren",  pct: 72,  from: "Slobozia",  to: "Chimpex", status: "Tranzit",  qty: "1.840 t" },
  { id: "TRN-2198", type: "tren",  pct: 45,  from: "Alexandria", to: "Brăila", status: "Avizare",  qty: "2.100 t" },
  { id: "B-44 XYZ", type: "camion", pct: 88, from: "Călărași",  to: "Chimpex", status: "Tranzit",  qty: "28 t" },
  { id: "CT-22 ABC",type: "camion", pct: 100, from: "Brăila",   to: "Slobozia",status: "Ajuns",    qty: "28 t" },
  { id: "Dunărea-7",type: "barja",  pct: 35,  from: "Galați",   to: "Chimpex", status: "Tranzit",  qty: "2.500 t" },
  { id: "Neptun-3", type: "barja",  pct: 62,  from: "Tulcea",   to: "Brăila",  status: "Avizare",  qty: "3.000 t" },
  { id: "IF-33 MNO",type: "camion", pct: 55,  from: "Buzău",    to: "Chimpex", status: "Tranzit",  qty: "28 t" },
];

const ACQ_DATA = [
  { product: "Grâu",       contracts: 4, qty: "1.840 t", price: "208 €/t", delta: 2 },
  { product: "Orz",        contracts: 2, qty: "640 t",   price: "185 €/t", delta: 0 },
  { product: "Porumb",     contracts: 3, qty: "1.120 t", price: "172 €/t", delta: -3 },
  { product: "Floarea S.", contracts: 5, qty: "2.100 t", price: "458 €/t", delta: 5 },
  { product: "Rapiță",     contracts: 2, qty: "680 t",   price: "487 €/t", delta: 1 },
];

// ── Card: Chimpex ─────────────────────────────────────────────────────────────

function CardChimpex() {
  return (
    <div className="mb-card">
      <div className="mb-card-head">
        <div className="mb-card-title">
          <IconSilo />
          Chimpex
        </div>
      </div>
      <div className="mb-col-headers">
        <div className="mb-col-row" style={{ gridTemplateColumns: "56px 1fr 72px 64px" }}>
          <span className="mb-col-cell">Celulă</span>
          <span className="mb-col-cell">Marfă</span>
          <span className="mb-col-cell">Stoc</span>
          <span className="mb-col-cell">Cap.</span>
        </div>
      </div>
      <div className="mb-card-body" style={{ maxHeight: 220 }}>
        {CHIMPEX_DATA.map((r) => {
          const pct = Math.round((r.stock / r.cap) * 100);
          return (
            <div key={r.id} className="mb-row" style={{ gridTemplateColumns: "56px 1fr 72px 64px" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{r.id}</span>
              <CommodityBadge name={r.commodity} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{(r.stock / 1000).toFixed(1)}k t</span>
                <FillBar pct={pct} />
                <span style={{ fontSize: 9.5, color: "#9ca3af" }}>{pct}%</span>
              </div>
              <span style={{ fontSize: 11, color: "#6b7280" }}>{(r.cap / 1000).toFixed(0)}k t</span>
            </div>
          );
        })}
      </div>
      <div className="mb-card-foot">
        <span className="mb-foot-label">Total stoc Chimpex</span>
        <span className="mb-foot-val">112.400 t</span>
      </div>
    </div>
  );
}

// ── Card: Silozuri Inland ─────────────────────────────────────────────────────

function CardInland() {
  return (
    <div className="mb-card">
      <div className="mb-card-head">
        <div className="mb-card-title">
          <IconWarehouse />
          Silozuri Inland
        </div>
      </div>
      <div className="mb-col-headers">
        <div className="mb-col-row" style={{ gridTemplateColumns: "72px 68px 1fr 72px 56px" }}>
          <span className="mb-col-cell">Siloz</span>
          <span className="mb-col-cell">Județ</span>
          <span className="mb-col-cell">Marfă</span>
          <span className="mb-col-cell">Stoc</span>
          <span className="mb-col-cell">Cap.</span>
        </div>
      </div>
      <div className="mb-card-body" style={{ maxHeight: 220 }}>
        {INLAND_DATA.map((r) => {
          const pct = Math.round((r.stock / r.cap) * 100);
          return (
            <div key={r.silo} className="mb-row" style={{ gridTemplateColumns: "72px 68px 1fr 72px 56px" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{r.silo}</span>
              <span style={{ fontSize: 10.5, color: "#6b7280" }}>{r.judet}</span>
              <CommodityBadge name={r.commodity} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{(r.stock / 1000).toFixed(1)}k t</span>
                <FillBar pct={pct} />
                <span style={{ fontSize: 9.5, color: "#9ca3af" }}>{pct}%</span>
              </div>
              <span style={{ fontSize: 11, color: "#6b7280" }}>{(r.cap / 1000).toFixed(0)}k t</span>
            </div>
          );
        })}
      </div>
      <div className="mb-card-foot">
        <span className="mb-foot-label">Total stoc Inland</span>
        <span className="mb-foot-val">74.000 t</span>
      </div>
    </div>
  );
}

// ── Card: Logistică Underway ─────────────────────────────────────────────────

function CardLogistics() {
  return (
    <div className="mb-card">
      <div className="mb-card-head">
        <div className="mb-card-title" style={{ justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, color: "#b9101e", flexShrink: 0 }}>
              <circle cx="5" cy="7" r="4" />
              <circle cx="5" cy="7" r="1.5" />
              <line x1="9" y1="4" x2="13" y2="2" />
              <line x1="9" y1="7" x2="13" y2="7" />
              <line x1="9" y1="10" x2="13" y2="12" />
            </svg>
            Logistică Underway
          </span>
          <div className="mb-live-dot" />
        </div>
      </div>
      <div className="mb-col-headers">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="mb-col-cell">Transport / Rută</span>
          <span className="mb-col-cell">Status</span>
        </div>
      </div>
      <div className="mb-card-body" style={{ maxHeight: 220 }}>
        {TRANSPORT_DATA.map((t) => (
          <div key={t.id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
            {/* Row 1: icon + id + qty + chip */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flexShrink: 0, width: 22, height: 14, display: "flex", alignItems: "center" }}>
                  {t.type === "tren" ? <IconTrain /> : t.type === "barja" ? <IconBarge /> : <IconTruck />}
                </div>
                <div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#111827" }}>{t.id}</span>
                  <span style={{ fontSize: 10.5, color: "#6b7280", marginLeft: 6 }}>{t.qty}</span>
                </div>
              </div>
              <TransportChip status={t.status} />
            </div>
            {/* Row 2: progress bar */}
            <div style={{ paddingLeft: 30, marginTop: 6 }}>
              <TransportBar pct={t.pct} status={t.status} type={t.type} />
              <div className="mb-tr-pts" style={{ marginTop: 8 }}>
                <span className="mb-tr-pt">{t.from}</span>
                <span className="mb-tr-pt">{t.to}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mb-card-foot">
        <span className="mb-foot-label">9 trenuri · 11 auto · 3 barje</span>
        <span className="mb-foot-val">23 active</span>
      </div>
    </div>
  );
}

// ── Card: Achiziții Live ──────────────────────────────────────────────────────

function CardAcquisitions() {
  return (
    <div className="mb-card">
      <div className="mb-card-head">
        <div className="mb-card-title" style={{ justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <IconCart />
            Achiziții Live
          </span>
          <div className="mb-live-dot" />
        </div>
      </div>
      <div className="mb-col-headers">
        <div className="mb-col-row" style={{ gridTemplateColumns: "1fr 64px 60px 64px 56px" }}>
          <span className="mb-col-cell">Produs</span>
          <span className="mb-col-cell">Ctrt.</span>
          <span className="mb-col-cell">Cant.</span>
          <span className="mb-col-cell">Preț med.</span>
          <span className="mb-col-cell">DAP Δ</span>
        </div>
      </div>
      <div className="mb-card-body" style={{ maxHeight: 220 }}>
        {ACQ_DATA.map((r) => (
          <div key={r.product} className="mb-row" style={{ gridTemplateColumns: "1fr 64px 60px 64px 56px" }}>
            <CommodityBadge name={r.product} />
            <span style={{ fontSize: 11, textAlign: "center" }}>{r.contracts}</span>
            <span style={{ fontSize: 11, color: "#374151" }}>{r.qty}</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{r.price}</span>
            <Delta val={r.delta} />
          </div>
        ))}
      </div>
      <div className="mb-acq-summary">
        <div className="mb-acq-kpi">
          <span className="mb-acq-kpi-label">Contracte azi</span>
          <span className="mb-acq-kpi-val">16</span>
        </div>
        <div className="mb-acq-kpi">
          <span className="mb-acq-kpi-label">Cantitate</span>
          <span className="mb-acq-kpi-val">6.380 t</span>
        </div>
        <div className="mb-acq-kpi">
          <span className="mb-acq-kpi-label">Valoare est.</span>
          <span className="mb-acq-kpi-val">1,42 M€</span>
        </div>
        <div className="mb-acq-kpi">
          <span className="mb-acq-kpi-label">Dominant</span>
          <span className="mb-acq-kpi-val" style={{ fontSize: 12 }}>Floarea S.</span>
        </div>
      </div>
    </div>
  );
}

// ── Placeholder card ──────────────────────────────────────────────────────────

function PlaceholderCard({ text }) {
  return (
    <div className="mb-card" style={{ margin: 16 }}>
      <div className="mb-placeholder">{text}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MotherboardPage() {
  const [mbTab, setMbTab] = useState("overview");

  const tabs = [
    { key: "overview",   label: "Overview" },
    { key: "stocks",     label: "Stocks" },
    { key: "logistics",  label: "Logistics" },
    { key: "execution",  label: "Execution" },
  ];

  return (
    <div className="motherboard-layout">
      {/* Secondary sub-nav */}
      <nav className="mb-subnav">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={"nav-item " + (mbTab === t.key ? "active" : "")}
            onClick={() => setMbTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Overview */}
      {mbTab === "overview" && (
        <div className="mb-overview-grid">
          <CardChimpex />
          <CardInland />
          <CardLogistics />
          <CardAcquisitions />
        </div>
      )}

      {/* Stocks */}
      {mbTab === "stocks" && (
        <PlaceholderCard text="Stocks — detalii complete stocuri Chimpex & Inland (urmează a fi completat)" />
      )}

      {/* Logistics */}
      {mbTab === "logistics" && (
        <PlaceholderCard text="Logistics — plan transport detaliat, toate mijloacele de transport active" />
      )}

      {/* Execution */}
      {mbTab === "execution" && (
        <PlaceholderCard text="Execution — recepție, calculații, contracte per proprietar" />
      )}
    </div>
  );
}
