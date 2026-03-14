import { useState } from "react";

// ── SVG icons ──────────────────────────────────────────────────────────────
// Section title icons: 14×14, strokeWidth 1.8, stroke="currentColor" → #b9101e via CSS

function IconSilo() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="4" height="8" rx="0.5" />
      <rect x="8" y="4" width="4" height="8" rx="0.5" />
      <path d="M2 4 C2 2.5 6 2.5 6 4" />
      <path d="M8 4 C8 2.5 12 2.5 12 4" />
    </svg>
  );
}

function IconWarehouse() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6L7 2l6 4v6H1V6z" />
      <rect x="5" y="8" width="4" height="4" />
    </svg>
  );
}

function IconCart() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1" />
      <circle cx="11" cy="12" r="1" />
      <path d="M1 1h2l1.5 7h7L13 4H4" />
    </svg>
  );
}

// Transport icons: front-facing filled, accept color prop

function IconTruck({ color = "#374151" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color}>
      {/* Cargo box body */}
      <rect x="2.5" y="1.5" width="19" height="10" rx="2" />
      {/* Windshield */}
      <rect x="5" y="3" width="14" height="6.5" rx="1.5" fill="white" fillOpacity="0.28" />
      {/* Cab / bumper row */}
      <rect x="1.5" y="11.5" width="21" height="5.5" rx="1.5" />
      {/* Headlights */}
      <rect x="3" y="13" width="4" height="2.5" rx="0.5" fill="white" fillOpacity="0.55" />
      <rect x="17" y="13" width="4" height="2.5" rx="0.5" fill="white" fillOpacity="0.55" />
      {/* Wheels */}
      <circle cx="6.5" cy="21" r="3" />
      <circle cx="17.5" cy="21" r="3" />
      <circle cx="6.5" cy="21" r="1.4" fill="white" fillOpacity="0.32" />
      <circle cx="17.5" cy="21" r="1.4" fill="white" fillOpacity="0.32" />
    </svg>
  );
}

function IconTrain({ color = "#374151" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color}>
      {/* Main body */}
      <rect x="3" y="2" width="18" height="14" rx="3.5" />
      {/* Windshield */}
      <rect x="5.5" y="4" width="13" height="8" rx="2" fill="white" fillOpacity="0.28" />
      {/* Headlights */}
      <circle cx="8" cy="15" r="2" fill="white" fillOpacity="0.55" />
      <circle cx="16" cy="15" r="2" fill="white" fillOpacity="0.55" />
      {/* Lower nose panel */}
      <rect x="4" y="17" width="16" height="3.5" rx="1.5" />
      {/* Rails */}
      <rect x="0.5" y="21.5" width="8" height="2" rx="0.5" />
      <rect x="15.5" y="21.5" width="8" height="2" rx="0.5" />
    </svg>
  );
}

function IconBarge({ color = "#374151" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color}>
      {/* Superstructure / bridge */}
      <rect x="7.5" y="2" width="9" height="6.5" rx="1.5" />
      {/* Bridge windows */}
      <rect x="9.5" y="3.5" width="5" height="3.5" rx="0.5" fill="white" fillOpacity="0.28" />
      {/* Hull body */}
      <rect x="3" y="8.5" width="18" height="6" rx="1" />
      {/* Portholes */}
      <circle cx="8.5" cy="11.5" r="1.5" fill="white" fillOpacity="0.35" />
      <circle cx="15.5" cy="11.5" r="1.5" fill="white" fillOpacity="0.35" />
      {/* Bow — hull tapers inward at bottom */}
      <path d="M3 14.5 L1 19.5 Q12 23.5 23 19.5 L21 14.5 Z" />
      {/* Waves */}
      <path d="M2 21 Q7 19.5 12 21 Q17 22.5 22 21"
        fill="none" stroke="white" strokeWidth="1.3"
        strokeLinecap="round" strokeOpacity="0.45" />
    </svg>
  );
}

// ── Fill bar ────────────────────────────────────────────────────────────────

function FillBar({ pct, height = 4 }) {
  const color = pct > 90 ? "#b9101e" : pct >= 60 ? "#eab308" : "#10b981";
  return (
    <div className="mb-fill-bar" style={{ height }}>
      <div className="mb-fill-inner" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Footer with total fill bar (stock cards) ──────────────────────────────────

function TotalFillFooter({ label, total, capacity }) {
  const pct = Math.min(Math.round((total / capacity) * 100), 100);
  const fmt = (n) => n.toLocaleString("en-US");
  return (
    <div className="mb-card-foot" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="mb-foot-label">{label}</span>
        <span className="mb-foot-val">
          {fmt(total)} t{" "}
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>/ {fmt(capacity)} t</span>
        </span>
      </div>
      <FillBar pct={pct} height={4} />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <span className="mb-row-meta">{pct}% utilized</span>
      </div>
    </div>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────

const CHIMPEX_DATA = [
  { commodity: "Wheat",     stock: 38500 },
  { commodity: "Corn",      stock: 32100 },
  { commodity: "Sunflower", stock: 19600 },
  { commodity: "Rapeseed",  stock: 12300 },
  { commodity: "Barley",    stock:  9800 },
];
const CHIMPEX_TOTAL    = 112400;
const CHIMPEX_CAPACITY = 235000;

const INLAND_DATA = [
  { commodity: "Wheat",     stock: 31600 },
  { commodity: "Corn",      stock: 22500 },
  { commodity: "Sunflower", stock: 11800 },
  { commodity: "Rapeseed",  stock: 21500 },
  { commodity: "Barley",    stock:  6400 },
];
const INLAND_TOTAL    = 93800;
const INLAND_CAPACITY = 302000;

const TRANSPORT_DATA = [
  { id: "TRN-2241",  type: "train", commodity: "Wheat",    from: "Slobozia",   to: "Chimpex",  qty: "1,840 t" },
  { id: "TRN-2198",  type: "train", commodity: "Corn",     from: "Alexandria", to: "Brăila",   qty: "2,100 t" },
  { id: "Danube-7",  type: "barge", commodity: "Wheat",    from: "Galați",     to: "Chimpex",  qty: "2,500 t" },
  { id: "Neptune-3", type: "barge", commodity: "Rapeseed", from: "Tulcea",     to: "Brăila",   qty: "3,000 t" },
  { id: "B-44 XYZ",  type: "truck", commodity: "Corn",     from: "Călărași",   to: "Chimpex",  qty: "28 t" },
  { id: "CT-22 ABC", type: "truck", commodity: "Wheat",    from: "Brăila",     to: "Slobozia", qty: "28 t" },
  { id: "IF-33 MNO", type: "truck", commodity: "Rapeseed", from: "Buzău",      to: "Chimpex",  qty: "28 t" },
];

// Transport type definitions — order determines display order
const TRANSPORT_TYPES = [
  { type: "train", label: "Train", Icon: IconTrain, color: "#b9101e" },
  { type: "barge", label: "Barge", Icon: IconBarge, color: "#1d4ed8" },
  { type: "truck", label: "Truck", Icon: IconTruck, color: "#16a34a" },
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
  const COLS = "1fr auto";
  return (
    <div className="mb-card">
      <div className="mb-card-head">
        <div className="mb-card-title">
          <span style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
            <IconSilo />
            Chimpex
          </span>
          <span className="mb-head-meta">Constanța</span>
        </div>
      </div>
      <div className="mb-col-headers">
        <div className="mb-col-row" style={{ gridTemplateColumns: COLS }}>
          <span className="mb-col-cell">Commodity</span>
          <span className="mb-col-cell" style={{ textAlign: "right" }}>Stock</span>
        </div>
      </div>
      <div className="mb-card-body" style={{ maxHeight: 220 }}>
        {CHIMPEX_DATA.map((r) => (
          <div key={r.commodity} className="mb-row" style={{ gridTemplateColumns: COLS }}>
            <span className="mb-row-label">{r.commodity}</span>
            <span className="mb-row-value" style={{ textAlign: "right" }}>{fmt(r.stock)} t</span>
          </div>
        ))}
      </div>
      <TotalFillFooter label="Total stock Chimpex" total={CHIMPEX_TOTAL} capacity={CHIMPEX_CAPACITY} />
    </div>
  );
}

// ── Card: Inland Silos ────────────────────────────────────────────────────────

function CardInland() {
  const fmt = (n) => n.toLocaleString("en-US");
  const COLS = "1fr auto";
  return (
    <div className="mb-card">
      <div className="mb-card-head">
        <div className="mb-card-title">
          <span style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
            <IconWarehouse />
            Inland Silos
          </span>
          <span className="mb-head-meta">Multiple locations</span>
        </div>
      </div>
      <div className="mb-col-headers">
        <div className="mb-col-row" style={{ gridTemplateColumns: COLS }}>
          <span className="mb-col-cell">Commodity</span>
          <span className="mb-col-cell" style={{ textAlign: "right" }}>Stock</span>
        </div>
      </div>
      <div className="mb-card-body" style={{ maxHeight: 220 }}>
        {INLAND_DATA.map((r) => (
          <div key={r.commodity} className="mb-row" style={{ gridTemplateColumns: COLS }}>
            <span className="mb-row-label">{r.commodity}</span>
            <span className="mb-row-value" style={{ textAlign: "right" }}>{fmt(r.stock)} t</span>
          </div>
        ))}
      </div>
      <TotalFillFooter label="Total stock Inland" total={INLAND_TOTAL} capacity={INLAND_CAPACITY} />
    </div>
  );
}

// ── Card: Logistics Underway ──────────────────────────────────────────────────

function CardLogistics() {
  const totalActive = TRANSPORT_DATA.length;

  return (
    <div className="mb-card">
      <div className="mb-card-head">
        <div className="mb-card-title">
          <span style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="5" cy="7" r="4" />
              <circle cx="5" cy="7" r="1.5" />
              <line x1="9" y1="4" x2="13" y2="2" />
              <line x1="9" y1="7" x2="13" y2="7" />
              <line x1="9" y1="10" x2="13" y2="12" />
            </svg>
            Logistics Underway
          </span>
          <span className="mb-head-meta" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div className="mb-live-dot" />
            {totalActive} active
          </span>
        </div>
      </div>

      <div className="mb-card-body" style={{ maxHeight: 260 }}>
        {TRANSPORT_TYPES.map(({ type, label, Icon, color }) => {
          const items = TRANSPORT_DATA.filter((t) => t.type === type);
          if (items.length === 0) return null;
          return (
            <div key={type} className="mb-logistics-group">
              {/* Type section header — colored per transport mode */}
              <div className="mb-logistics-type-head">
                <Icon color={color} />
                <span style={{ color }}>{label}</span>
                <span className="mb-logistics-count"
                  style={{ background: color + "18", color }}>
                  {items.length}
                </span>
              </div>
              {/* Rows: commodity + route | qty */}
              {items.map((t) => (
                <div key={t.id} className="mb-row" style={{ gridTemplateColumns: "1fr auto" }}>
                  <div>
                    <div className="mb-row-label">{t.commodity}</div>
                    <div className="mb-row-meta">{t.from} → {t.to}</div>
                  </div>
                  <span className="mb-row-value">{t.qty}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="mb-card-foot">
        <span className="mb-foot-label">
          {TRANSPORT_TYPES.map(({ type, label }) => {
            const n = TRANSPORT_DATA.filter((t) => t.type === type).length;
            return n > 0 ? `${n} ${label.toLowerCase()}${n > 1 ? "s" : ""}` : null;
          }).filter(Boolean).join(" · ")}
        </span>
        <span className="mb-foot-val">{totalActive} active</span>
      </div>
    </div>
  );
}

// ── Card: Contracts Today ─────────────────────────────────────────────────────

function CardAcquisitions() {
  const today = new Date().toLocaleDateString("en-GB"); // dd/mm/yyyy
  const COLS = "1fr 48px 80px 72px";
  const totalContracts = ACQ_DATA.reduce((s, r) => s + r.contracts, 0);

  return (
    <div className="mb-card">
      <div className="mb-card-head">
        <div className="mb-card-title">
          <span style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
            <IconCart />
            Contracts Today
          </span>
          <span className="mb-head-meta" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div className="mb-live-dot" />
            {today}
          </span>
        </div>
      </div>
      <div className="mb-col-headers">
        <div className="mb-col-row" style={{ gridTemplateColumns: COLS }}>
          <span className="mb-col-cell">Product</span>
          <span className="mb-col-cell" style={{ textAlign: "center" }}>No.</span>
          <span className="mb-col-cell" style={{ textAlign: "right" }}>Qty.</span>
          <span className="mb-col-cell" style={{ textAlign: "right" }}>Avg. Price</span>
        </div>
      </div>
      <div className="mb-card-body" style={{ maxHeight: 220 }}>
        {ACQ_DATA.map((r) => (
          <div key={r.product} className="mb-row" style={{ gridTemplateColumns: COLS }}>
            <span className="mb-row-label">{r.product}</span>
            <span className="mb-row-value" style={{ textAlign: "center" }}>{r.contracts}</span>
            <span className="mb-row-value" style={{ textAlign: "right" }}>{r.qty}</span>
            <span className="mb-row-value" style={{ textAlign: "right" }}>{r.price}</span>
          </div>
        ))}
      </div>
      {/* Totals row — pinned, aligned to column grid */}
      <div className="mb-totals-row">
        <div style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "center" }}>
          <span className="mb-totals-label">Total</span>
          <span className="mb-totals-value" style={{ textAlign: "center" }}>{totalContracts}</span>
          <span className="mb-totals-value" style={{ textAlign: "right" }}>6,380 t</span>
          <span className="mb-totals-dash" style={{ textAlign: "right" }}>—</span>
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

      {mbTab === "overview" && (
        <div className="mb-overview-grid">
          <CardChimpex />
          <CardInland />
          <CardLogistics />
          <CardAcquisitions />
        </div>
      )}

      {mbTab === "stocks" && (
        <PlaceholderCard text="Stocks — full stock details for Chimpex & Inland silos (coming soon)" />
      )}

      {mbTab === "logistics" && (
        <PlaceholderCard text="Logistics — detailed transport plan, all active means of transport" />
      )}

      {mbTab === "execution" && (
        <PlaceholderCard text="Execution — intake, calculations, contracts per owner" />
      )}
    </div>
  );
}
