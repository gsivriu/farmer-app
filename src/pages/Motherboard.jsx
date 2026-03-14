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

// ── Fill bar ────────────────────────────────────────────────────────────────

function FillBar({ pct, height = 5 }) {
  const color = pct > 90 ? "#b9101e" : pct >= 60 ? "#eab308" : "#10b981";
  return (
    <div className="mb-fill-bar" style={{ minWidth: 48, height }}>
      <div className="mb-fill-inner" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Transport chip ──────────────────────────────────────────────────────────

function TransportChip({ status }) {
  const cls =
    status === "In Transit" ? "mb-chip mb-chip-transit" :
    status === "Pending"    ? "mb-chip mb-chip-wait" :
    "mb-chip mb-chip-done";
  return <span className={cls}>{status}</span>;
}

// ── Transport progress bar ───────────────────────────────────────────────────

function TransportBar({ pct, status }) {
  const fillColor =
    status === "In Transit" ? "#1d4ed8" :
    status === "Pending"    ? "#92400e" :
    "#166534";

  return (
    <div className="mb-tr-bar-outer">
      <div className="mb-tr-bar-fill" style={{ width: `${pct}%`, background: fillColor }} />
    </div>
  );
}

// ── Footer with total fill bar ────────────────────────────────────────────────

function TotalFillFooter({ label, total, capacity }) {
  const pct = Math.min(Math.round((total / capacity) * 100), 100);
  const fmt = (n) => n.toLocaleString("en-US");
  return (
    <div className="mb-card-foot" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="mb-foot-label">{label}</span>
        <span className="mb-foot-val">
          {fmt(total)} t{" "}
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af" }}>/ {fmt(capacity)} t</span>
        </span>
      </div>
      <FillBar pct={pct} height={6} />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>{pct}% utilized</span>
      </div>
    </div>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────

// Chimpex — aggregated by commodity (combining cells with same product)
const CHIMPEX_DATA = [
  { commodity: "Wheat",     stock: 38500 },  // C-01 East + C-06 East 2
  { commodity: "Corn",      stock: 32100 },  // C-02 West
  { commodity: "Sunflower", stock: 19600 },  // C-03 North
  { commodity: "Rapeseed",  stock: 12300 },  // C-04 South
  { commodity: "Barley",    stock:  9800 },  // C-05 Central
];
const CHIMPEX_TOTAL    = 112400;
const CHIMPEX_CAPACITY = 235000;

// Inland Silos — aggregated by commodity across all locations
const INLAND_DATA = [
  { commodity: "Wheat",     stock: 31600 },  // Slobozia + Buzău
  { commodity: "Corn",      stock: 22500 },  // Călărași
  { commodity: "Sunflower", stock: 11800 },  // Brăila
  { commodity: "Rapeseed",  stock: 21500 },  // Alexandria
  { commodity: "Barley",    stock:  6400 },  // Galați
];
const INLAND_TOTAL    = 93800;
const INLAND_CAPACITY = 302000;

const TRANSPORT_DATA = [
  { id: "TRN-2241",  type: "train", pct: 72,  from: "Slobozia",   to: "Chimpex",  status: "In Transit", qty: "1,840 t" },
  { id: "TRN-2198",  type: "train", pct: 45,  from: "Alexandria", to: "Brăila",   status: "Pending",    qty: "2,100 t" },
  { id: "B-44 XYZ",  type: "truck", pct: 88,  from: "Călărași",   to: "Chimpex",  status: "In Transit", qty: "28 t" },
  { id: "CT-22 ABC", type: "truck", pct: 100, from: "Brăila",     to: "Slobozia", status: "Arrived",    qty: "28 t" },
  { id: "Danube-7",  type: "barge", pct: 35,  from: "Galați",     to: "Chimpex",  status: "In Transit", qty: "2,500 t" },
  { id: "Neptune-3", type: "barge", pct: 62,  from: "Tulcea",     to: "Brăila",   status: "Pending",    qty: "3,000 t" },
  { id: "IF-33 MNO", type: "truck", pct: 55,  from: "Buzău",      to: "Chimpex",  status: "In Transit", qty: "28 t" },
];

const ACQ_DATA = [
  { product: "Wheat",     contracts: 4, qty: "1,840 t", price: "208 €/t" },
  { product: "Barley",    contracts: 2, qty: "640 t",   price: "185 €/t" },
  { product: "Corn",      contracts: 3, qty: "1,120 t", price: "172 €/t" },
  { product: "Sunflower", contracts: 5, qty: "2,100 t", price: "458 $/t" },
  { product: "Rapeseed",  contracts: 2, qty: "680 t",   price: "487 €/t" },
];

// ── Card: Chimpex ─────────────────────────────────────────────────────────────

function CardChimpex() {
  const fmt = (n) => n.toLocaleString("en-US");
  return (
    <div className="mb-card">
      <div className="mb-card-head">
        <div className="mb-card-title">
          <IconSilo />
          Chimpex
        </div>
      </div>
      <div className="mb-col-headers">
        <div className="mb-col-row" style={{ gridTemplateColumns: "1fr 80px" }}>
          <span className="mb-col-cell">Commodity</span>
          <span className="mb-col-cell" style={{ textAlign: "right" }}>Stock</span>
        </div>
      </div>
      <div className="mb-card-body" style={{ maxHeight: 200 }}>
        {CHIMPEX_DATA.map((r) => (
          <div key={r.commodity} className="mb-row" style={{ gridTemplateColumns: "1fr 80px" }}>
            <span style={{ fontSize: 12.5, color: "#374151", fontWeight: 700 }}>{r.commodity}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#111827", textAlign: "right" }}>
              {fmt(r.stock)} t
            </span>
          </div>
        ))}
      </div>
      <TotalFillFooter
        label="Total stock Chimpex"
        total={CHIMPEX_TOTAL}
        capacity={CHIMPEX_CAPACITY}
      />
    </div>
  );
}

// ── Card: Inland Silos ────────────────────────────────────────────────────────

function CardInland() {
  const fmt = (n) => n.toLocaleString("en-US");
  return (
    <div className="mb-card">
      <div className="mb-card-head">
        <div className="mb-card-title">
          <IconWarehouse />
          Inland Silos
        </div>
      </div>
      <div className="mb-col-headers">
        <div className="mb-col-row" style={{ gridTemplateColumns: "1fr 80px" }}>
          <span className="mb-col-cell">Commodity</span>
          <span className="mb-col-cell" style={{ textAlign: "right" }}>Stock</span>
        </div>
      </div>
      <div className="mb-card-body" style={{ maxHeight: 200 }}>
        {INLAND_DATA.map((r) => (
          <div key={r.commodity} className="mb-row" style={{ gridTemplateColumns: "1fr 80px" }}>
            <span style={{ fontSize: 12.5, color: "#374151", fontWeight: 700 }}>{r.commodity}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#111827", textAlign: "right" }}>
              {fmt(r.stock)} t
            </span>
          </div>
        ))}
      </div>
      <TotalFillFooter
        label="Total stock Inland"
        total={INLAND_TOTAL}
        capacity={INLAND_CAPACITY}
      />
    </div>
  );
}

// ── Card: Logistics Underway ──────────────────────────────────────────────────

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
            Logistics Underway
          </span>
          <div className="mb-live-dot" />
        </div>
      </div>
      <div className="mb-col-headers">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="mb-col-cell">Transport / Route</span>
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
                  {t.type === "train" ? <IconTrain /> : t.type === "barge" ? <IconBarge /> : <IconTruck />}
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
        <span className="mb-foot-label">9 trains · 11 trucks · 3 barges</span>
        <span className="mb-foot-val">23 active</span>
      </div>
    </div>
  );
}

// ── Card: Contracts Today ─────────────────────────────────────────────────────

function CardAcquisitions() {
  const today = new Date().toLocaleDateString("en-GB"); // dd/mm/yyyy
  const COLS = "1fr 110px 80px 90px";
  const totalContracts = ACQ_DATA.reduce((s, r) => s + r.contracts, 0);
  const totalQty = "6,380 t";

  return (
    <div className="mb-card">
      <div className="mb-card-head">
        <div className="mb-card-title" style={{ justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <IconCart />
            Contracts Today — {today}
          </span>
          <div className="mb-live-dot" />
        </div>
      </div>

      {/* Column headers */}
      <div className="mb-col-headers">
        <div className="mb-col-row" style={{ gridTemplateColumns: COLS }}>
          <span className="mb-col-cell">Product</span>
          <span className="mb-col-cell" style={{ textAlign: "center" }}>No. Contracts</span>
          <span className="mb-col-cell">Qty.</span>
          <span className="mb-col-cell" style={{ textAlign: "right" }}>Avg. Price</span>
        </div>
      </div>

      {/* Data rows */}
      <div className="mb-card-body" style={{ maxHeight: 220 }}>
        {ACQ_DATA.map((r) => (
          <div key={r.product} className="mb-row" style={{ gridTemplateColumns: COLS, padding: "11px 0" }}>
            <span style={{ fontSize: 12.5, color: "#374151", fontWeight: 600 }}>{r.product}</span>
            <span style={{ fontSize: 12, textAlign: "center", color: "#111827" }}>{r.contracts}</span>
            <span style={{ fontSize: 12, color: "#374151" }}>{r.qty}</span>
            <span style={{ fontSize: 12, fontWeight: 600, textAlign: "right" }}>{r.price}</span>
          </div>
        ))}
      </div>

      {/* Totals row — pinned below data, aligned to columns */}
      <div style={{ borderTop: "1.5px solid #e5e7eb", padding: "8px 16px 10px" }}>
        <div style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "center" }}>
          <span style={{ fontSize: 10.5, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", textAlign: "center" }}>{totalContracts}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{totalQty}</span>
          <span style={{ fontSize: 12, color: "#9ca3af", textAlign: "right" }}>—</span>
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
      {/* Secondary sub-nav — centered on desktop */}
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
        <PlaceholderCard text="Stocks — full stock details for Chimpex & Inland silos (coming soon)" />
      )}

      {/* Logistics */}
      {mbTab === "logistics" && (
        <PlaceholderCard text="Logistics — detailed transport plan, all active means of transport" />
      )}

      {/* Execution */}
      {mbTab === "execution" && (
        <PlaceholderCard text="Execution — intake, calculations, contracts per owner" />
      )}
    </div>
  );
}
