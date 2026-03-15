import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import StocksPage from "./Motherboard/StocksPage";
import { TrainIcon, BargeIcon, TruckIcon } from "../components/TransportIcons";
import { useAppContext } from "../context/AppContext.jsx";
import { getProductLabelSafe } from "../utils/productLabels";
import { formatCompactNumber } from "../utils/numberFormat";

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
  { id: "TRN-2241",  type: "train", status: "underdischarge", commodity: "Wheat",     from: "Darmanesti",  to: "Chimpex",   qty: "1,840 t" },
  { id: "TRN-2198",  type: "train", status: "in_transit",     commodity: "Corn",      from: "Sarulesti",   to: "Chimpex",   qty: "2,100 t" },
  { id: "TRN-2305",  type: "train", status: "waiting_zone",   commodity: "Sunflower", from: "Ciocarlia",   to: "Chimpex",   qty: "1,540 t" },
  { id: "TRN-2177",  type: "train", status: "underloading",   commodity: "Rapeseed",  from: "Babeni",      to: "Silotrans", qty: "980 t"   },
  { id: "TRN-2089",  type: "train", status: "scheduled",      commodity: "Wheat",     from: "Vladeni",     to: "Chimpex",   qty: "2,020 t" },
  { id: "Danube-7",  type: "barge", commodity: "Wheat",       from: "Galați",         to: "Chimpex",       qty: "2,500 t" },
  { id: "Neptune-3", type: "barge", commodity: "Rapeseed",    from: "Macin",          to: "Chimpex",       qty: "3,000 t" },
  { id: "B-44 XYZ",  type: "truck", commodity: "Corn",        from: "Vladeni",        to: "Silotrans",     qty: "28 t"    },
  { id: "CT-22 ABC", type: "truck", commodity: "Wheat",       from: "Ciresu",         to: "Babeni",        qty: "28 t"    },
  { id: "IF-33 MNO", type: "truck", commodity: "Rapeseed",    from: "Ciocarlia",      to: "Chimpex",       qty: "28 t"    },
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
  // Derived from the same mock data as the Logistics tab so both are in sync
  // mockTrains and mockBarges are defined later in this file but are module-scope
  // consts, so they're available by the time this component renders.
  const trainRows = mockTrains
    .filter(t => t.furnizor)
    .map(t => {
      const total = t.status === "sub_descarcare"
        ? (t.cantitate_descarcata ?? 0) + (t.cantitate_nedescarcata ?? 0)
        : (t.cantitate ?? null);
      return {
        id: `tr-${t.id}`,
        name: t.furnizor,
        route: [t.locatie_incarcare, t.locatie_descarcare].filter(Boolean).join(" → "),
        qty: total != null ? `${total.toLocaleString("en-US")} t` : "—",
      };
    });

  const bargeRows = mockBarges.map(b => ({
    id: `br-${b.id}`,
    name: b.barge,
    route: [b.pol, b.locatie_descarcare ?? "Chimpex"].filter(Boolean).join(" → "),
    qty: fmtTon(b.bl_quantity),
  }));

  const truckRows = TRANSPORT_DATA.filter(t => t.type === "truck").map(t => ({
    id: t.id,
    name: t.commodity,
    route: `${t.from} → ${t.to}`,
    qty: t.qty,
  }));

  const sections = [
    { type: "train", label: "Train", Icon: TrainIcon, color: "#b9101e", bgColor: "#fef2f2", borderColor: "#b9101e", items: trainRows },
    { type: "barge", label: "Barge", Icon: BargeIcon, color: "#1d4ed8", bgColor: "#eff6ff", borderColor: "#1d4ed8", items: bargeRows },
    { type: "truck", label: "Auto",  Icon: TruckIcon, color: "#15803d", bgColor: "#f0fdf4", borderColor: "#15803d", items: truckRows },
  ];
  const totalActive = trainRows.length + bargeRows.length + truckRows.length;

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
        {sections.map(({ type, label, Icon, color, bgColor, borderColor, items }) => {
          if (items.length === 0) return null;
          return (
            <div key={type} className="mb-logistics-group">
              <div className={`tr-group-header tr-group--${type}`}>
                <div className="tr-type-icon">
                  <Icon size={16} color={color} bgColor={bgColor} borderColor={borderColor} />
                </div>
                <span className="tr-type-label">{label}</span>
                <span className="tr-type-count">{items.length}</span>
              </div>
              {items.map(t => (
                <div key={t.id} className="tr-item-row">
                  <div className="tr-item-info">
                    <span className="tr-item-name">{t.name}</span>
                    <span className="tr-item-route">{t.route}</span>
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
          {sections
            .filter(s => s.items.length > 0)
            .map(s => `${s.items.length} ${s.label.toLowerCase()}${s.items.length > 1 ? "s" : ""}`)
            .join(" · ")}
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
    <div className="mb-card acq-table">
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
  const [activeIdx, setActiveIdx] = useState(0);
  const carouselRef = useRef(null);

  const handleScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = el.firstChild?.offsetWidth ?? el.offsetWidth;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIdx(Math.min(idx, VESSELS_MOCK.length - 1));
  }, []);

  return (
    <div className="mb-card vessels-section">
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

      <div
        className="vessels-grid"
        ref={carouselRef}
        onScroll={handleScroll}
      >
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
                        {vessel.loadedTons.toLocaleString("en-US")}
                      </span>
                      <span className="vessel-total"> / {vessel.totalTons.toLocaleString("en-US")} t</span>
                    </span>
                  </div>
                  <div className="vessel-bar-bg">
                    <div
                      className="vessel-bar-fill"
                      style={{ width: `${pct}%`, background: isOnRoads ? "#d1d5db" : colors.accent }}
                    />
                  </div>
                  <div className="vessel-pct" style={{ color: isOnRoads ? "#9ca3af" : colors.accent }}>
                    {isOnRoads ? "—" : `${pct}%`}
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
                  <div className="vessel-date-val" style={{ color: isDemurrageWarning ? "#ea580c" : undefined, fontWeight: isDemurrageWarning ? 700 : undefined }}>
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
                  · {remaining.toLocaleString("en-US")} t remaining
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

      <div className="vessels-carousel-dots">
        {VESSELS_MOCK.map((_, i) => (
          <span key={i} className={"vessels-dot" + (i === activeIdx ? " vessels-dot--active" : "")} />
        ))}
      </div>
    </div>
  );
}

// ── Logistics Tab ────────────────────────────────────────────────────────────

// TODO: replace with Supabase fetch
const mockTrains = [
  {
    id: 1,
    furnizor: "LA CIMP NOU for AMS",
    locatie_incarcare: "Darmanesti 24",
    produs: "Wheat",
    cantitate_descarcata: 1038,
    cantitate_nedescarcata: 550,
    tip_vag: "11 FALS UTZ",
    locatie_descarcare: "Chimpex",
    status: "sub_descarcare",
    transport_asigurat: null,
  },
  {
    id: 2,
    furnizor: "Ameropa Grains",
    locatie_incarcare: "Vladeni 17",
    produs: "Corn",
    cantitate: 1603,
    eta: "In Faurei",
    tip_vag: "32 TADS DBCR",
    locatie_descarcare: "Chimpex",
    status: "on_the_way",
    transport_asigurat: "FCA",
  },
  {
    id: 3,
    furnizor: "Marsat",
    locatie_incarcare: "Roman 6",
    produs: "Corn",
    cantitate: 1600,
    vagoane_incarcate: 11,
    etc: "16.03.2026",
    tip_vag: "33 TALS DBCF",
    locatie_descarcare: "Chimpex",
    status: "sub_incarcare",
    transport_asigurat: "FCA PCA",
  },
  {
    id: 4,
    furnizor: "Marsat",
    locatie_incarcare: "Roman 7",
    produs: "Corn",
    cantitate: 1600,
    accept_portuar: "To be requested",
    tip_vag: "33 TALS DBCR",
    locatie_descarcare: "Chimpex",
    status: "programat_incarcare",
    data_programarii: "to be scheduled",
    transport_asigurat: "FCA PCA",
  },
  { id: 5, furnizor: null, locatie_incarcare: null, produs: null, status: "asteptare_zona" },
];

const TRAIN_STATUS_GROUPS = [
  { key: "sub_descarcare",      label: "Underdischarge",          color: "#E53935" },
  { key: "asteptare_zona",      label: "Waiting Zone",            color: "#FB8C00" },
  { key: "on_the_way",          label: "On the Way",              color: "#1E88E5" },
  { key: "sub_incarcare",       label: "Underloading",            color: "#43A047" },
  { key: "programat_incarcare", label: "Scheduled for Loading",   color: "#757575" },
];

const WAITING_STATUSES = ["asteptare_zona"];

function TrainCard({ train }) {
  const isWaiting = WAITING_STATUSES.includes(train.status);

  if (isWaiting) {
    return (
      <div className="train-card train-card--empty">
        No trains waiting
      </div>
    );
  }

  const total = train.status === "sub_descarcare"
    ? (train.cantitate_descarcata ?? 0) + (train.cantitate_nedescarcata ?? 0)
    : (train.cantitate ?? null);
  const pct = train.status === "sub_descarcare" && total > 0
    ? Math.round((train.cantitate_descarcata / total) * 100)
    : null;

  return (
    <div className="train-card">
      {/* Row 1 — furnizor + produs · cantitate */}
      <div className="train-card-row1">
        <span className="train-card-furnizor">{train.furnizor}</span>
        <span className="train-card-produs-qty">
          {train.produs}{total != null ? ` · ${total.toLocaleString("en-US")} t` : ""}
        </span>
      </div>

      {/* Row 2 — route */}
      {(train.locatie_incarcare || train.locatie_descarcare) && (
        <div className="train-card-route">
          {train.locatie_incarcare} → {train.locatie_descarcare}
        </div>
      )}

      {/* Row 3 — tip vagon */}
      {train.tip_vag && (
        <div className="train-card-detail">
          <span className="train-card-lbl">Vag:</span> {train.tip_vag}
        </div>
      )}

      {/* Row 4 — sub_descarcare progress */}
      {train.status === "sub_descarcare" && (
        <div className="train-card-progress">
          <div className="train-card-progress-nums">
            <span>Unloaded: <strong>{train.cantitate_descarcata?.toLocaleString("en-US")} t</strong></span>
            <span>Remaining: <strong>{train.cantitate_nedescarcata?.toLocaleString("en-US")} t</strong></span>
          </div>
          <div className="train-card-bar-bg">
            <div className="train-card-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Row 5 — on_the_way ETA */}
      {train.status === "on_the_way" && train.eta && (
        <div className="train-card-detail">
          <span className="train-card-lbl">ETA:</span> {train.eta}
        </div>
      )}

      {/* Row 6 — sub_incarcare */}
      {train.status === "sub_incarcare" && (train.etc || train.vagoane_incarcate != null) && (
        <div className="train-card-detail">
          {train.etc && <><span className="train-card-lbl">ETC:</span> {train.etc}</>}
          {train.etc && train.vagoane_incarcate != null && <span className="train-card-sep"> · </span>}
          {train.vagoane_incarcate != null && <>Wagons loaded: <strong>{train.vagoane_incarcate}</strong></>}
        </div>
      )}

      {/* Row 7 — programat_incarcare */}
      {train.status === "programat_incarcare" && (
        <>
          {train.accept_portuar && (
            <div className="train-card-detail">
              <span className="train-card-lbl">Port acceptance:</span> {train.accept_portuar}
            </div>
          )}
          {train.data_programarii && (
            <div className="train-card-detail">
              <span className="train-card-lbl">Scheduled date:</span> {train.data_programarii}
            </div>
          )}
        </>
      )}

      {/* Row 8 — transport asigurat badges */}
      {train.transport_asigurat && (
        <div className="train-card-badges">
          {train.transport_asigurat.split(" ").map(b => (
            <span key={b} className="train-card-badge">{b}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function TrainSection({ trains }) {
  const active    = trains.filter(t => ["sub_descarcare", "on_the_way", "sub_incarcare"].includes(t.status)).length;
  const scheduled = trains.filter(t => t.status === "programat_incarcare").length;
  const waiting   = trains.filter(t => WAITING_STATUSES.includes(t.status)).length;
  const withData  = trains.filter(t => t.furnizor).length;

  return (
    <div className="logi-section">
      <div className="logi-section-head">
        <div className="logi-section-title">
          <TrainIcon size={16} color="#b9101e" bgColor="#fef2f2" borderColor="#b9101e" />
          <span>Train</span>
        </div>
        <span className="logi-type-badge" style={{ color: "#b9101e", background: "#fef2f2" }}>{withData}</span>
      </div>

      {TRAIN_STATUS_GROUPS.map(group => {
        const rows = trains.filter(t => t.status === group.key);
        if (rows.length === 0) return null;
        return (
          <div key={group.key} className="train-status-group">
            <div className="train-status-header">
              <span className="train-status-label" style={{ color: group.color }}>{group.label}</span>
              {rows.some(t => t.furnizor) && (
                <span className="train-status-count" style={{ color: group.color }}>
                  {rows.filter(t => t.furnizor).length} {rows.filter(t => t.furnizor).length > 1 ? "trains" : "train"}
                </span>
              )}
            </div>
            {rows.map(t => <TrainCard key={t.id} train={t} />)}
          </div>
        );
      })}

      <div className="logi-section-foot">
        {active} trains active · {scheduled} scheduled · {waiting} waiting
      </div>
    </div>
  );
}

// TODO: replace with Supabase fetch
const mockBarges = [
  { id: 1,  buyer: "AMG", supplier: "Agro Oil",           pol: "Harsova",      convoy: null,                   barge: "Elena1",            goods: "RO CORN", bl_quantity: 235500,   ttl_quantity: 1002720,  nor: "12/03/2026 18:30", status: "under_discharging",          ds_quantity: 250000,  survey_company: "CU",              transport: null, tw_l: null,  pro_l: null  },
  { id: 2,  buyer: "AMG", supplier: "Eurosilo Z",          pol: "Gostinu",      convoy: null,                   barge: "Maestro 03",        goods: "RO WHT",  bl_quantity: 2918220,  ttl_quantity: 2918220,  nor: "13/03/2026 14:30", status: "waiting_etb",                etb: "14.03",         survey_company: "CU",              transport: null, tw_l: 79.53, pro_l: 12.55 },
  { id: 3,  buyer: "AMG", supplier: "Octopod",             pol: "Oryahovo",     convoy: null,                   barge: "NBL-035",           goods: "BG WHT",  bl_quantity: 1965940,  ttl_quantity: 1965940,  eta_pod: "ETA Constanta 14.03.2026 06:00 hrs agw wp wog",  status: "under_coming", owners_agents: "TIA",              transport: "CIF", discharging_permit_qty: 1965940, tw_l: 73.1,  pro_l: 12.88 },
  { id: 4,  buyer: "AMG", supplier: "Dobromih Ceres",      pol: "Ceatalchioi",  convoy: null,                   barge: "Early Bird",        goods: "RO WHT",  bl_quantity: 1001910,  ttl_quantity: 2045770,  eta_pod: "ETA Constanta 17.03.2026 agw wp wog",            status: "under_coming", owners_agents: "Diamat Shipping",  transport: "FOB", tw_l: 75.5,  pro_l: 15.50 },
  { id: 5,  buyer: "AMG", supplier: "Dobromih Ceres",      pol: "Ceatalchioi",  convoy: null,                   barge: "Tesco",             goods: "RO WHT",  bl_quantity: 1043860,  ttl_quantity: 2045770,  eta_pod: "ETA Constanta 17.03.2026 agw wp wog",            status: "under_coming", owners_agents: "Diamat Shipping",  transport: "FOB", tw_l: 73.85, pro_l: 15.50 },
  { id: 6,  buyer: "AMS", supplier: "Octopod",             pol: "Somovit",      convoy: "1389/11586",           barge: "1389/11586",        goods: "BG WHT",  bl_quantity: 990260,   ttl_quantity: 1400000,                                                             status: "wait_departure",             owners_agents: "TTS/Navrom",       transport: "CIF", tw_l: null,  pro_l: null  },
  { id: 7,  buyer: "AMS", supplier: "Octopod",             pol: "Somovit",      convoy: "1272/30075",           barge: "1272/30075",        goods: "BG WHT",  bl_quantity: 1371500,  ttl_quantity: 1400000,                                                             status: "wait_departure",             owners_agents: "TTS/Navrom",       transport: "CIF", tw_l: null,  pro_l: null  },
  { id: 8,  buyer: "AMS", supplier: "Octopod",             pol: "Somovit",      convoy: "1147/30058",           barge: "1147/30058",        goods: "BG WHT",  bl_quantity: 1400000,  ttl_quantity: 1400000,                                                             status: "under_loading",              owners_agents: "TTS/Navrom",       transport: "CIF", tw_l: null,  pro_l: null  },
  { id: 9,  buyer: "AMG", supplier: "Agro Oil",            pol: "Harsova",      convoy: null,                   barge: "Tessa",             goods: "RO CORN", bl_quantity: 1200000,  ttl_quantity: 1250000,                                                             status: "under_loading",              owners_agents: "First Nav",        transport: "FOB", tw_l: null,  pro_l: null  },
  { id: 10, buyer: "AMG", supplier: "Agro Oil",            pol: "Harsova",      convoy: null,                   barge: "Leo",               goods: "RO CORN", bl_quantity: 1050000,  ttl_quantity: 1250000,                                                             status: "waiting_to_start_loading",   owners_agents: "First Nav",        transport: "FOB", tw_l: null,  pro_l: null  },
  { id: 11, buyer: "AMS", supplier: "Rusagro-Prim SRL",    pol: "Giurgiulesti", convoy: "TEMPTATION or subst.", barge: "TEMPTATION",        goods: "MD WHT",  bl_quantity: 5000000,  ttl_quantity: 5000000,  etb: "15.03.2026 agw wp wog",                              status: "under_coming", owners_agents: "Inland Shipping",  transport: "DAP", tw_l: null,  pro_l: null  },
];

function fmtTon(qty) {
  if (qty == null) return "—";
  return (qty / 1000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " t";
}


function BargeCard({ barge }) {
  const pct = barge.ttl_quantity > 0
    ? Math.round((barge.bl_quantity / barge.ttl_quantity) * 100)
    : 0;
  const buyerStyle = barge.buyer === "AMS"
    ? { color: "#1d4ed8", background: "#eff6ff" }
    : barge.buyer === "AMG"
    ? { color: "#b9101e", background: "#fef2f2" }
    : { color: "#374151", background: "#f3f4f6" };

  return (
    <div className="barge-card">
      {/* Row 1 — barge name + buyer / goods + qty */}
      <div className="barge-card-row1">
        <div className="barge-name-wrap">
          <span className="barge-card-name">{barge.barge}</span>
          <span className="barge-buyer-badge" style={buyerStyle}>{barge.buyer}</span>
        </div>
        <span className="barge-card-goods-qty">
          {barge.goods} · {fmtTon(barge.bl_quantity)}
        </span>
      </div>

      {/* Row 2 — supplier + pol */}
      <div className="barge-card-detail">
        Supplier: <strong>{barge.supplier}</strong>
        {barge.pol && <> · POL: <strong>{barge.pol}</strong></>}
      </div>

      {/* Row 3 — convoy */}
      {barge.convoy && (
        <div className="barge-card-detail">
          <span className="barge-card-lbl">Convoy:</span> {barge.convoy}
        </div>
      )}

      {/* Row 4 — agents + transport badge */}
      {(barge.owners_agents || barge.transport) && (
        <div className="barge-card-row4">
          {barge.owners_agents && (
            <span className="barge-card-detail">
              <span className="barge-card-lbl">Agents:</span> {barge.owners_agents}
            </span>
          )}
          {barge.transport && (
            <span className="barge-transport-badge">{barge.transport}</span>
          )}
        </div>
      )}

      {/* Row 5 — under_discharging */}
      {barge.status === "under_discharging" && (
        <div className="barge-status-block">
          <span className="barge-chip barge-chip--red">Under Discharging</span>
          {barge.nor && (
            <div className="barge-card-detail">
              NOR: {barge.nor}
              {barge.ds_quantity != null && <> · D/S Qty: {fmtTon(barge.ds_quantity)}</>}
            </div>
          )}
          {barge.survey_company && (
            <div className="barge-card-detail">
              <span className="barge-card-lbl">Survey:</span> {barge.survey_company}
            </div>
          )}
        </div>
      )}

      {/* Row 5 — waiting_etb */}
      {barge.status === "waiting_etb" && (
        <div className="barge-status-block">
          <span className="barge-chip barge-chip--amber">Waiting ETB{barge.etb ? ` ${barge.etb}` : ""}</span>
          {barge.nor && <div className="barge-card-detail">NOR: {barge.nor}</div>}
          {(barge.tw_l != null || barge.pro_l != null) && (
            <div className="barge-card-detail">
              {barge.tw_l != null && <>TW-L: {barge.tw_l}</>}
              {barge.tw_l != null && barge.pro_l != null && " · "}
              {barge.pro_l != null && <>Pro-L: {barge.pro_l}</>}
            </div>
          )}
        </div>
      )}

      {/* Row 6 — under_coming */}
      {barge.status === "under_coming" && (
        <div className="barge-status-block">
          <span className="barge-chip barge-chip--blue">Under Coming</span>
          {barge.eta_pod && <div className="barge-card-eta">{barge.eta_pod}</div>}
          {barge.etb && <div className="barge-card-detail"><span className="barge-card-lbl">ETB:</span> {barge.etb}</div>}
          {barge.discharging_permit_qty != null && (
            <div className="barge-card-detail">
              <span className="barge-card-lbl">Permit Qty:</span> {fmtTon(barge.discharging_permit_qty)}
            </div>
          )}
          {(barge.tw_l != null || barge.pro_l != null) && (
            <div className="barge-card-detail">
              {barge.tw_l != null && <>TW-L: {barge.tw_l}</>}
              {barge.tw_l != null && barge.pro_l != null && " · "}
              {barge.pro_l != null && <>Pro-L: {barge.pro_l}</>}
            </div>
          )}
        </div>
      )}

      {/* Row 7 — wait_departure */}
      {barge.status === "wait_departure" && (
        <div className="barge-status-block">
          <span className="barge-chip barge-chip--orange">Waiting Departure</span>
        </div>
      )}

      {/* Row 7 — under_loading */}
      {barge.status === "under_loading" && (
        <div className="barge-status-block">
          <span className="barge-chip barge-chip--green">Under Loading</span>
          <div className="barge-card-progress">
            <div className="barge-card-progress-nums">
              <span>{fmtTon(barge.bl_quantity)} / {fmtTon(barge.ttl_quantity)}</span>
              <span>{pct}%</span>
            </div>
            <div className="barge-card-bar-bg">
              <div className="barge-card-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Row 7 — waiting_to_start_loading */}
      {barge.status === "waiting_to_start_loading" && (
        <div className="barge-status-block">
          <span className="barge-chip barge-chip--gray">Waiting to Start Loading</span>
        </div>
      )}
    </div>
  );
}

function BargeSection({ barges }) {
  const sumQty = arr => arr.reduce((s, b) => s + (b.bl_quantity ?? 0), 0);
  const arrived = barges.filter(b => ["under_discharging", "waiting_etb"].includes(b.status));
  const coming  = barges.filter(b => b.status === "under_coming");
  const loading = barges.filter(b => ["under_loading", "wait_departure", "waiting_to_start_loading"].includes(b.status));
  const groups  = [
    { label: "Arrived / Under Operation", color: "#E53935", items: arrived },
    { label: "Under Coming",              color: "#1E88E5", items: coming  },
    { label: "Under Loading",             color: "#43A047", items: loading },
  ];

  return (
    <div className="logi-section">
      <div className="logi-section-head">
        <div className="logi-section-title">
          <BargeIcon size={16} color="#1d4ed8" bgColor="#eff6ff" borderColor="#1d4ed8" />
          <span>Barge</span>
        </div>
        <span className="logi-type-badge" style={{ color: "#1d4ed8", background: "#eff6ff" }}>{barges.length}</span>
      </div>

      {groups.map(group => {
        if (group.items.length === 0) return null;
        return (
          <div key={group.label} className="train-status-group">
            <div className="train-status-header">
              <span className="train-status-label" style={{ color: group.color }}>{group.label}</span>
              <span className="train-status-count" style={{ color: group.color }}>
                {group.items.length} {group.items.length > 1 ? "barges" : "barge"}
              </span>
            </div>
            {group.items.map(b => <BargeCard key={b.id} barge={b} />)}
            <div className="barge-group-total">
              Total: {group.items.length} {group.items.length > 1 ? "barges" : "barge"} · {fmtTon(sumQty(group.items))}
            </div>
          </div>
        );
      })}

      <div className="logi-section-foot">
        {arrived.length} arrived · {coming.length} under coming · {loading.length} under loading · {fmtTon(sumQty(barges))} total
      </div>
    </div>
  );
}

function LogisticsTypeSection({ items, Icon, color, bgColor, borderColor, label }) {
  return (
    <div className="logi-section">
      <div className="logi-section-head">
        <div className="logi-section-title">
          <Icon size={16} color={color} bgColor={bgColor} borderColor={borderColor} />
          <span>{label}</span>
        </div>
        <span className="logi-type-badge" style={{ color, background: bgColor }}>{items.length}</span>
      </div>
      {items.map(t => (
        <div key={t.id} className="logi-row-card">
          <div className="logi-row-info">
            <span className="logi-row-id">{t.id}</span>
            <span className="logi-row-route">{t.from} → {t.to}</span>
          </div>
          <div className="logi-row-right">
            <span className="logi-row-qty">{t.qty}</span>
            <span className="logi-row-commodity">{t.commodity}</span>
          </div>
        </div>
      ))}
      <div className="logi-section-foot">
        {items.length} {label.toLowerCase()}{items.length !== 1 ? "s" : ""} · {items.length} active
      </div>
    </div>
  );
}

function LogisticsTab() {
  const trucks = TRANSPORT_DATA.filter(t => t.type === "truck");

  return (
    <div className="logi-tab">
      <TrainSection trains={mockTrains} />
      <BargeSection barges={mockBarges} />
      {trucks.length > 0 && (
        <LogisticsTypeSection
          items={trucks} label="Auto"
          Icon={TruckIcon} color="#15803d" bgColor="#f0fdf4" borderColor="#15803d"
        />
      )}
    </div>
  );
}

// ── Execution Tab ────────────────────────────────────────────────────────────

// TODO: replace mockCalculation with real data fetched from Supabase per contract
const mockCalculation = {
  calculation_number: "206602",
  calculation_date: "13/03/2026",
  magazie: "MAGAZIE/PLATFORMA 1",
  partener: "Partener Demo SRL",
  produs: "GRAU PANIFICATIE",
  silo: "FARCASELE",
  contract: "C/BKS/MWHT/25/90080",
  ext: "5919",
  data_contract: "13/03/2026",
  perioada_livrare_start: "13/03/2026",
  perioada_livrare_end: "30/03/2026",
  mijloc_transport: "OT27RTY",
  aviz: "335",
  data_receptie: "13/03/2026",
  pret_contract: 950.00,
  pret: 950.00,
  cantitate_receptionata: 25.400,
  cantitate_util: 25.400,
  specificatii: [
    { name: "Corpuri Straine",      moneda: "RON", price_base: 2.00,  indice_receptie: 1.80,  depasire: 0.00 },
    { name: "Umiditate",            moneda: "RON", price_base: 14.00, indice_receptie: 10.30, depasire: 0.00 },
    { name: "Masa Hectolitrica",    moneda: "RON", price_base: 77.00, indice_receptie: 77.60, depasire: 0.00 },
    { name: "Continut de Proteina", moneda: "RON", price_base: 12.00, indice_receptie: 14.34, depasire: 0.00 },
    { name: "Umiditate",            moneda: "RON", price_base: 14.00, indice_receptie: 10.30, depasire: 0.00 },
    { name: "Corpuri Straine",      moneda: "RON", price_base: 2.00,  indice_receptie: 1.80,  depasire: 0.00 },
    { name: "Infestie",             moneda: "RON", price_base: 0.00,  indice_receptie: 0.00,  depasire: 0.00 },
    { name: "Invazie",              moneda: "RON", price_base: 0.00,  indice_receptie: 0.00,  depasire: 0.00 },
  ],
  cantitate_finala: 25.4000,
  unitate: "mto",
  pret_standard: 950.00000,
  pret_de_facturat: 950.00,
  moneda_finala: "RON",
  data_facturare: "13/03/2026",
  curs_schimb: 1.0000,
  pret_ron: 950.00,
  valoare: 24130.00,
  valoare_tva: 0.00,
  total: 24130.00,
  intocmit_de: "Andreea Ghita",
};

function CalculationSheet({ calc }) {
  const fmt = (n, dec = 2) =>
    Number(n).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });

  return (
    <div className="calc-sheet">

      {/* ── Section 1: Company header ── */}
      <div className="calc-company-header">
        <span className="calc-company-name">AMEROPA GRAINS SA</span>
        <span className="calc-magazie">{calc.magazie}</span>
      </div>
      <div className="calc-divider" />

      {/* ── Section 2: Contract info ── */}
      <div className="calc-section">
        <div className="calc-info-grid">
          {[
            ["Partener",          calc.partener],
            ["Produs",            calc.produs],
            ["Silo",              calc.silo],
            ["Contract",          `${calc.contract} · Ext. ${calc.ext}`],
            ["Data Contract",     calc.data_contract],
            ["Perioada Livrare",  `${calc.perioada_livrare_start} → ${calc.perioada_livrare_end}`],
          ].map(([lbl, val]) => (
            <div key={lbl} className="calc-info-row">
              <span className="calc-lbl">{lbl}</span>
              <span className="calc-val">{val}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="calc-divider" />

      {/* ── Section 3: Transport ── */}
      <div className="calc-section">
        <div className="calc-transport-table">
          <div className="calc-transport-header">
            <span>Mijloc Transport</span>
            <span>Aviz</span>
            <span>Data Recep.</span>
            <span>Pret Contr.</span>
            <span>Pret</span>
            <span>Cant. Recep.</span>
            <span>Cant. Util</span>
          </div>
          <div className="calc-transport-row">
            <span>{calc.mijloc_transport}</span>
            <span>{calc.aviz}</span>
            <span>{calc.data_receptie}</span>
            <span>{fmt(calc.pret_contract)}</span>
            <span>{fmt(calc.pret)}</span>
            <span>{fmt(calc.cantitate_receptionata, 3)}</span>
            <span>{fmt(calc.cantitate_util, 3)}</span>
          </div>
        </div>
      </div>
      <div className="calc-divider" />

      {/* ── Section 4: Specificatii calitative ── */}
      <div className="calc-section">
        <div className="calc-section-title">Specificații Calitative</div>
        <div className="calc-spec-table">
          <div className="calc-spec-header">
            <span>Specificatie</span>
            <span>Moneda</span>
            <span>Price Base</span>
            <span>Indice Recep.</span>
            <span>Depasire</span>
          </div>
          {calc.specificatii.map((s, i) => (
            <div key={i} className="calc-spec-row">
              <span>{s.name}</span>
              <span>{s.moneda}</span>
              <span>{fmt(s.price_base)}</span>
              <span style={{ color: s.indice_receptie > s.price_base ? "#43A047" : s.indice_receptie < s.price_base ? "#E53935" : undefined }}>
                {fmt(s.indice_receptie)}
              </span>
              <span style={{ color: s.depasire > 0 ? "#E53935" : "#9ca3af", fontWeight: s.depasire > 0 ? 700 : undefined }}>
                {fmt(s.depasire)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="calc-divider" />

      {/* ── Section 5: Totals ── */}
      <div className="calc-section">
        <div className="calc-totals-rows">
          <div className="calc-totals-row">
            <div className="calc-totals-item">
              <span className="calc-lbl">Cantitate</span>
              <div className="calc-val">{fmt(calc.cantitate_finala, 4)} {calc.unitate}</div>
            </div>
            <div className="calc-totals-item">
              <span className="calc-lbl">Pret Standard</span>
              <div className="calc-val">{fmt(calc.pret_standard, 5)}</div>
            </div>
            <div className="calc-totals-item">
              <span className="calc-lbl">Pret de Facturat</span>
              <div className="calc-val">{fmt(calc.pret_de_facturat)} {calc.moneda_finala}</div>
            </div>
          </div>
          <div className="calc-totals-row">
            <div className="calc-totals-item">
              <span className="calc-lbl">De facturat la</span>
              <div className="calc-val">{calc.data_facturare}</div>
            </div>
            <div className="calc-totals-item">
              <span className="calc-lbl">Curs Schimb</span>
              <div className="calc-val">{fmt(calc.curs_schimb, 4)}</div>
            </div>
          </div>
          <div className="calc-totals-box">
            <div className="calc-totals-box-grid">
              <div>
                <span className="calc-lbl">Pret (RON)</span>
                <div className="calc-val">{fmt(calc.pret_ron)}</div>
              </div>
              <div>
                <span className="calc-lbl">Valoare</span>
                <div className="calc-val">{fmt(calc.valoare)}</div>
              </div>
              <div>
                <span className="calc-lbl">Valoare TVA</span>
                <div className="calc-val">{fmt(calc.valoare_tva)}</div>
              </div>
            </div>
            <div className="calc-total-final">
              TOTAL: {fmt(calc.total)} RON
            </div>
          </div>
        </div>
      </div>
      <div className="calc-divider" />

      {/* ── Section 6: Document footer ── */}
      <div className="calc-doc-footer">
        <span>Întocmit de: <em>{calc.intocmit_de}</em></span>
        <span>Semnatura: ___________</span>
      </div>

    </div>
  );
}

const PAYMENT_STYLES = {
  fully_paid:      { bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7", label: "FULLY PAID"      },
  partially_paid:  { bg: "#FFF3E0", color: "#E65100", border: "#FFCC80", label: "PARTIALLY PAID"  },
  payment_pending: { bg: "#F5F5F5", color: "#757575", border: "#E0E0E0", label: "PAYMENT PENDING" },
};

const DEMO_PAYMENT = ["fully_paid", "partially_paid", "payment_pending"];
const DEMO_PCT     = [100, 60, 30, 0];

function ExecutionTab() {
  // TODO: replace with Supabase fetch when ready
  const { bids } = useAppContext();

  const acceptedBids = useMemo(
    () => (Array.isArray(bids) ? bids.filter(b => b.status === "accepted") : []),
    [bids]
  );

  // Local UI state per bid — TODO: persist calculation_sent + payment_status to Supabase
  const [calcState, setCalcState] = useState({});
  useEffect(() => {
    setCalcState(prev => {
      const next = { ...prev };
      acceptedBids.forEach((b, idx) => {
        if (!next[b.id]) {
          // TODO: replace demo payment_status with real Supabase values
          next[b.id] = {
            calculation_sent: false,
            payment_status: DEMO_PAYMENT[idx % 3],
            demoPct: DEMO_PCT[idx % 4],
          };
        }
      });
      return next;
    });
  }, [acceptedBids]);

  const [modalBid, setModalBid] = useState(null);
  const [toast, setToast]       = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const sendCalculation = (bid) => {
    setModalBid(null);
    setCalcState(prev => ({
      ...prev,
      [bid.id]: { ...prev[bid.id], calculation_sent: true },
    }));
    showToast(`Calculation sent to ${mockCalculation.partener}`);
  };

  const fmtDMY = (v) => {
    if (!v) return "";
    const [y, m, d] = String(v).slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  };
  const fmtDelivery = (s, e) => {
    if (!s && !e) return "—";
    return e ? `${fmtDMY(s)} — ${fmtDMY(e)}` : fmtDMY(s);
  };
  const fmtPrice = (bid) => {
    const p = bid.final_price ?? bid.counter_price ?? bid.price;
    if (!p) return "—";
    const unit = ["FCA", "FOR", "FOB"].includes(String(bid.parity || "").toUpperCase()) ? "RON/t" : "€/t";
    return `${formatCompactNumber(p)} ${unit}`;
  };

  // Sort: partially delivered → not delivered → fully paid
  const sortedBids = useMemo(() => [...acceptedBids].sort((a, b) => {
    const urgency = (bid) => {
      const ps = calcState[bid.id]?.payment_status;
      if (ps === "fully_paid") return 2;
      const pct = calcState[bid.id]?.demoPct ?? 0;
      return pct > 0 ? 0 : 1;
    };
    return urgency(a) - urgency(b);
  }), [acceptedBids, calcState]);

  return (
    <div className="exec-tab">

      {/* ── Toast ── */}
      {toast && <div className="exec-toast">✅ {toast}</div>}

      {/* ── Summary bar ── */}
      <div className="exec-summary">
        {acceptedBids.length} contracts
      </div>

      {/* ── Contract cards ── */}
      {sortedBids.map(bid => {
        const state    = calcState[bid.id] ?? { calculation_sent: false, payment_status: "payment_pending", demoPct: 0 };
        // TODO: fetch real delivered_quantity from Supabase
        const delivered = bid.quantity > 0 ? (bid.quantity * (state.demoPct ?? 0)) / 100 : 0;
        const pct      = state.demoPct ?? 0;
        const barColor = pct === 0 ? "#E0E0E0" : pct === 100 ? "#43A047" : pct >= 50 ? "#FB8C00" : "#E53935";
        const pmt      = PAYMENT_STYLES[state.payment_status] ?? PAYMENT_STYLES.payment_pending;

        return (
          <div key={bid.id} className="exec-card">

            {/* Row 1 — product + payment pill */}
            <div className="exec-card-r1">
              <span className="exec-card-product">{getProductLabelSafe(bid.product)}</span>
              <div className="exec-card-pills">
                <span className="exec-pill" style={{ background: pmt.bg, color: pmt.color, borderColor: pmt.border }}>{pmt.label}</span>
              </div>
            </div>

            {/* Row 2 — qty · price (secondary, gray) */}
            <div className="exec-card-r2">
              <span className="exec-qty-val">{formatCompactNumber(bid.quantity)} t</span>
              <span className="exec-price-val">{fmtPrice(bid)}</span>
            </div>

            {/* Row 3 — incoterm · delivery period */}
            <div className="exec-card-r3">
              {[bid.parity, fmtDelivery(bid.delivery_start, bid.delivery_end)].filter(Boolean).join("  ·  ")}
            </div>

            {/* Row 4 — delivery progress */}
            <div className="exec-progress">
              <div className="exec-progress-labels">
                <span>Delivered</span>
                <span className="exec-progress-qty">{formatCompactNumber(delivered)} / {formatCompactNumber(bid.quantity)} t</span>
              </div>
              <div className="exec-bar-bg">
                <div className="exec-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
              </div>
              <div className="exec-pct" style={{ color: pct === 0 ? "#9ca3af" : barColor }}>{pct}%</div>
            </div>

            {/* Row 6 — email + calc button */}
            <div className="exec-card-r6">
              {bid.farmer_email && (
                <span className="exec-email">✉ {bid.farmer_email}</span>
              )}
              {state.calculation_sent ? (
                <span className="exec-calc-sent">✅ Sent</span>
              ) : (
                <button className="exec-calc-btn-sm" onClick={() => setModalBid(bid)}>
                  Calculation
                </button>
              )}
            </div>

          </div>
        );
      })}

      {acceptedBids.length === 0 && (
        <div className="exec-empty">No accepted contracts yet</div>
      )}

      {/* ── Calculation Modal ── */}
      {modalBid && (
        <div className="exec-modal-backdrop" onClick={() => setModalBid(null)}>
          <div className="exec-modal" onClick={e => e.stopPropagation()}>

            {/* Top bar — handle + close */}
            <div className="exec-modal-topbar">
              <div className="exec-modal-handle" />
              <button className="exec-modal-close" onClick={() => setModalBid(null)}>✕</button>
            </div>

            {/* Header */}
            <div className="exec-modal-header">
              <div className="exec-modal-title">
                Calculatie {mockCalculation.calculation_number} / {mockCalculation.calculation_date}
              </div>
              <div className="exec-modal-sub">
                {mockCalculation.partener} — {mockCalculation.produs}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="exec-modal-body">
              <CalculationSheet calc={mockCalculation} />
            </div>

            {/* Sticky footer */}
            <div className="exec-modal-footer">
              <button className="exec-modal-send" onClick={() => sendCalculation(modalBid)}>
                Send Calculation
              </button>
            </div>

          </div>
        </div>
      )}
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
        <div className="mb-tab-body">
          <CardVessels />
          <div className="mb-overview-grid">
            <CardChimpex />
            <CardInland />
            <CardLogistics />
            <CardAcquisitions />
          </div>
        </div>
      )}

      {mbTab === "stocks" && (
        <StocksPage />
      )}

      {mbTab === "logistics" && (
        <LogisticsTab />
      )}

      {mbTab === "execution" && (
        <ExecutionTab />
      )}
    </div>
  );
}
