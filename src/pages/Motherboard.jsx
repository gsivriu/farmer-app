import { useState } from "react";
import StocksPage from "./Motherboard/StocksPage";
import { TrainIcon, BargeIcon, TruckIcon } from "../components/TransportIcons";

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
const CHIMPEX_TOTAL    = 112300;
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
  { id: "TRN-2241",  type: "train", commodity: "Wheat",    from: "Darmanesti",   to: "Chimpex",  qty: "1,840 t" },
  { id: "TRN-2198",  type: "train", commodity: "Corn",     from: "Sarulesti", to: "Chimpex",   qty: "2,100 t" },
  { id: "Danube-7",  type: "barge", commodity: "Wheat",    from: "Galați",     to: "Chimpex",  qty: "2,500 t" },
  { id: "Neptune-3", type: "barge", commodity: "Rapeseed", from: "Macin",     to: "Chimpex",   qty: "3,000 t" },
  { id: "B-44 XYZ",  type: "truck", commodity: "Corn",     from: "Vladeni",   to: "Silotrans",  qty: "28 t" },
  { id: "CT-22 ABC", type: "truck", commodity: "Wheat",    from: "Ciresu",     to: "Babeni", qty: "28 t" },
  { id: "IF-33 MNO", type: "truck", commodity: "Rapeseed", from: "Ciocarlia",      to: "Chimpex",  qty: "28 t" },
];

// Transport type definitions — order determines display order
const TRANSPORT_TYPES = [
  { type: "train", label: "Train", Icon: TrainIcon, color: "#b9101e", bgColor: "#fef2f2", borderColor: "#b9101e" },
  { type: "barge", label: "Barge", Icon: BargeIcon, color: "#1d4ed8", bgColor: "#eff6ff", borderColor: "#1d4ed8" },
  { type: "truck", label: "Truck", Icon: TruckIcon, color: "#15803d", bgColor: "#f0fdf4", borderColor: "#15803d" },
];

const ACQ_DATA = [
  { product: "Wheat",     contracts: 4, qty: "1,840 t", price: "208 €/t" },
  { product: "Barley",    contracts: 2, qty: "640 t",   price: "185 €/t" },
  { product: "Corn",      contracts: 3, qty: "1,120 t", price: "172 €/t" },
  { product: "Sunflower", contracts: 5, qty: "2,100 t", price: "458 $/t" },
  { product: "Rapeseed",  contracts: 2, qty: "680 t",   price: "487 €/t" },
];

const VESSELS_MOCK = [
  {
    id: "v1",
    name: "MV Kerkyra",
    status: "loading",
    product: "wheat",
    productLabel: "Wheat",
    loadedTons: 42800,
    totalTons: 55000,
    startedLoading: "2026-03-10",
    laydayExpires: "2026-03-16",
  },
  {
    id: "v2",
    name: "MV Dacia Star",
    status: "loading",
    product: "corn",
    productLabel: "Corn",
    loadedTons: 12000,
    totalTons: 38000,
    startedLoading: "2026-03-13",
    laydayExpires: "2026-03-21",
  },
  {
    id: "v3",
    name: "MV Black Sea Express",
    status: "on_roads",
    product: "sunflower",
    productLabel: "Sunflower",
    loadedTons: 0,
    totalTons: 47000,
    arrivedRoads: "2026-03-14",
    estBerth: "2026-03-15",
  },
];

const PRODUCT_COLORS = {
  wheat:     { accent: "#ca8a04", iconBg: "#fef9c3", stroke: "#ca8a04", dot: "#ca8a04", text: "#854d0e" },
  corn:      { accent: "#16a34a", iconBg: "#dcfce7", stroke: "#16a34a", dot: "#16a34a", text: "#166534" },
  sunflower: { accent: "#ea580c", iconBg: "#fff7ed", stroke: "#ea580c", dot: "#ea580c", text: "#9a3412" },
  rapeseed:  { accent: "#059669", iconBg: "#ecfdf5", stroke: "#059669", dot: "#059669", text: "#065f46" },
  barley:    { accent: "#2563eb", iconBg: "#eff6ff", stroke: "#2563eb", dot: "#2563eb", text: "#1e40af" },
};

const daysUntil = (dateStr) => {
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const fmtDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
};

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
        {TRANSPORT_TYPES.map(({ type, label, Icon, color, bgColor, borderColor }) => {
          const items = TRANSPORT_DATA.filter((t) => t.type === type);
          if (items.length === 0) return null;
          return (
            <div key={type} className="mb-logistics-group">
              {/* Group header: colored icon box + uppercase label + count */}
              <div className={`tr-group-header tr-group--${type}`}>
                <div className="tr-type-icon">
                  <Icon size={16} color={color} bgColor={bgColor} borderColor={borderColor} />
                </div>
                <span className="tr-type-label">{label}</span>
                <span className="tr-type-count">{items.length}</span>
              </div>
              {/* Individual transport rows */}
              {items.map((t) => (
                <div key={t.id} className="tr-item-row">
                  <div className="tr-item-info">
                    <span className="tr-item-name">{t.commodity}</span>
                    <span className="tr-item-route">{t.from} → {t.to}</span>
                  </div>
                  <span className="tr-item-qty">{t.qty}</span>
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

// ── Card: Vessels Underloading ────────────────────────────────────────────────

function CardVessels() {
  return (
    <div className="vessels-section">
      <div className="vessels-section-head">
        <div className="mb-card-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="#b9101e" strokeWidth="1.8"
               strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/>
            <path d="M4 14 2 20M20 14l2 6"/>
            <path d="M4 14h16"/>
            <path d="M6 14V8l6-4 6 4v6"/>
            <line x1="12" y1="4" x2="12" y2="14"/>
            <line x1="8" y1="10" x2="16" y2="10"/>
          </svg>
          Vessels Underloading
        </div>
        <span style={{ fontSize: 11, color: "#6b7280" }}>
          {VESSELS_MOCK.filter(v => v.status === "loading").length} loading
          {" · "}
          {VESSELS_MOCK.filter(v => v.status === "on_roads").length} on roads
        </span>
      </div>

      <div className="vessels-grid">
        {VESSELS_MOCK.map(vessel => {
          const colors = PRODUCT_COLORS[vessel.product] ?? PRODUCT_COLORS.wheat;
          const pct = vessel.totalTons > 0
            ? Math.round((vessel.loadedTons / vessel.totalTons) * 1000) / 10
            : 0;
          const daysLeft = vessel.laydayExpires ? daysUntil(vessel.laydayExpires) : null;
          const isDemurrageWarning = daysLeft !== null && daysLeft <= 3;
          const remaining = vessel.totalTons - vessel.loadedTons;
          const isOnRoads = vessel.status === "on_roads";
          return (
            <div
              key={vessel.id}
              className={"vessel-card" + (isOnRoads ? " vessel-card--muted" : "")}
            >
              <div
                className="vessel-accent"
                style={{ background: isOnRoads ? "#d1d5db" : colors.accent }}
              />
              <div className="vessel-body">
                <div className="vessel-top">
                  <div className="vessel-name-wrap">
                    <div
                      className="vessel-icon"
                      style={{ background: isOnRoads ? "#f3f4f6" : colors.iconBg }}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                           stroke={isOnRoads ? "#9ca3af" : colors.stroke}
                           strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 20a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/>
                        <path d="M4 14 2 20M20 14l2 6"/>
                        <path d="M4 14h16"/>
                        <path d="M6 14V8l6-4 6 4v6"/>
                        <line x1="12" y1="4" x2="12" y2="14"/>
                        <line x1="8" y1="10" x2="16" y2="10"/>
                      </svg>
                    </div>
                    <div className="vessel-name">{vessel.name}</div>
                  </div>
                  <span className={"vessel-chip " + (isOnRoads ? "vessel-chip--road" : "vessel-chip--loading")}>
                    {isOnRoads ? "On roads" : "Loading"}
                  </span>
                </div>

                <div className="vessel-product">
                  <span className="vessel-dot" style={{ background: isOnRoads ? "#d1d5db" : colors.dot }} />
                  <span style={{ color: isOnRoads ? "#9ca3af" : colors.text }}>{vessel.productLabel}</span>
                </div>

                <div className="vessel-progress">
                  <div className="vessel-progress-nums">
                    <span>
                      <span className="vessel-loaded" style={{ color: isOnRoads ? "#9ca3af" : "#111827" }}>
                        {vessel.loadedTons.toLocaleString("ro-RO")}
                      </span>
                      <span className="vessel-total"> / {vessel.totalTons.toLocaleString("ro-RO")} t</span>
                    </span>
                    <span className="vessel-pct">{isOnRoads ? "—" : `${pct}%`}</span>
                  </div>
                  <div className="vessel-bar-bg">
                    <div
                      className="vessel-bar-fill"
                      style={{ width: `${pct}%`, background: isOnRoads ? "#d1d5db" : colors.accent }}
                    />
                  </div>
                </div>
              </div>

              <div className="vessel-dates">
                <div className="vessel-date-cell">
                  <div className="vessel-date-label">
                    {isOnRoads ? "Arrived roads" : "Started loading"}
                  </div>
                  <div className="vessel-date-val">
                    {fmtDate(isOnRoads ? vessel.arrivedRoads : vessel.startedLoading)}
                  </div>
                </div>
                <div className="vessel-date-cell">
                  <div className="vessel-date-label">
                    {isOnRoads ? "Est. berth" : "Layday expires"}
                  </div>
                  <div className="vessel-date-val" style={{ color: isDemurrageWarning ? "#ea580c" : undefined }}>
                    {fmtDate(isOnRoads ? vessel.estBerth : vessel.laydayExpires)}
                  </div>
                </div>
              </div>

              {isOnRoads && (
                <div className="vessel-footer vessel-footer--neutral">Layday starts on berthing</div>
              )}
              {!isOnRoads && isDemurrageWarning && (
                <div className="vessel-footer vessel-footer--warning">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                       stroke="#ea580c" strokeWidth="2" strokeLinecap="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  {daysLeft} {daysLeft === 1 ? "day" : "days"} to demurrage
                  · {remaining.toLocaleString("ro-RO")} t remaining
                </div>
              )}
              {!isOnRoads && !isDemurrageWarning && daysLeft !== null && (
                <div className="vessel-footer vessel-footer--ok">
                  {daysLeft} days remaining
                </div>
              )}
            </div>
          );
        })}
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
        <>
          <div className="mb-overview-grid">
            <CardChimpex />
            <CardInland />
            <CardLogistics />
            <CardAcquisitions />
          </div>
          <CardVessels />
        </>
      )}

      {mbTab === "stocks" && (
        <StocksPage />
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
