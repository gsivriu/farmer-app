import { useState } from "react";
import { getProductLabelSafe } from "../../utils/productLabels";
import { hasPositiveNumber } from "../../utils/numberFormat";
import { formatLocationDisplay, isFreightParity } from "../../utils/formatting";
import "./BidCardV2.css";

/* ── Inline Lucide icons (Building2, Calendar, MapPin) ── */
function IconSvg({ children, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
const IconBuilding = ({ size }) => (
  <IconSvg size={size}>
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
    <path d="M6 12H4a2 2 0 0 0-2 2v8h4" />
    <path d="M18 9h2a2 2 0 0 1 2 2v11h-4" />
    <path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
  </IconSvg>
);
const IconCalendar = ({ size }) => (
  <IconSvg size={size}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8"  y1="2" x2="8"  y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </IconSvg>
);
const IconMapPin = ({ size }) => (
  <IconSvg size={size}>
    <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </IconSvg>
);

/* ── Status mapping ── */
const STATUS_LABELS = {
  pending: "În așteptare",
  accepted: "Acceptat",
  rejected: "Respins",
  countered: "Contra-ofertă",
  farmer_countered: "Răspuns fermier",
};

function statusKey(s) {
  const v = String(s || "").toLowerCase();
  if (v === "accepted") return "accepted";
  if (v === "rejected") return "rejected";
  if (v === "countered" || v === "farmer_countered") return "info";
  return "pending";
}

/* ── Formatters ── */
function formatPrice(amount, unit) {
  const n = Number(amount || 0);
  return new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " " + unit;
}

function formatRelative(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const h = (now - d) / 36e5;
  const days = h / 24;
  if (h < 1) return "acum câteva minute";
  if (h < 24) return `acum ${Math.floor(h)}h`;
  if (days < 2) return "ieri";
  return d.toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });
}

function formatDeliveryShort(from, to) {
  const opts = { day: "2-digit", month: "2-digit", year: "numeric" };
  const fmt = (x) => {
    const d = new Date(x);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ro-RO", opts);
  };
  if (!from && !to) return "—";
  return `${fmt(from)} – ${fmt(to)}`;
}

function resolveDisplayPrice(bid) {
  const s = String(bid.status || "").toLowerCase();
  if (s === "accepted" || s === "rejected") {
    return bid.final_price ?? (hasPositiveNumber(bid.counter_price) ? bid.counter_price : bid.price);
  }
  if (hasPositiveNumber(bid.counter_price)) return bid.counter_price;
  return bid.price;
}

const ACTIONABLE = new Set(["pending", "farmer_countered"]);

/* ── BidCardV2 ── */
export default function BidCardV2({ bid, onClick, onAccept, onReject, onCounter }) {
  const [confirming, setConfirming] = useState(null); // null | "accepted" | "rejected"

  const skey = statusKey(bid.status);
  const statusLabel = STATUS_LABELS[String(bid.status || "").toLowerCase()] || STATUS_LABELS.pending;
  const unit = `${bid.currency || (bid.product === "sunflower" ? "USD" : "EUR")}/t`;
  const price = resolveDisplayPrice(bid);
  const isActionable = ACTIONABLE.has(String(bid.status || "").toLowerCase());

  const product = getProductLabelSafe(bid.product);
  const harvestYear = bid.crop_year || "—";
  const quantity = Number(bid.quantity || 0);

  const farmerName = bid.farmer_email || bid.farmer_id || "—";
  const locationLabel = isFreightParity(bid.parity)
    ? formatLocationDisplay(bid.loading_location || "—")
    : formatLocationDisplay(bid.delivery_location || "—");
  const parityDisplay = bid.parity
    ? (locationLabel && locationLabel !== "—" ? `${bid.parity} ${locationLabel}` : bid.parity)
    : "—";

  const dateLabel = formatRelative(bid.created_at);
  const resolvedAt = bid.accepted_at || bid.created_at;
  const resolvedRelative = formatRelative(resolvedAt);

  const handleCardClick = () => {
    if (confirming) { setConfirming(null); return; }
    onClick?.();
  };

  const showActions = isActionable && (onAccept || onReject || onCounter);

  /* ── Footer / actions content ── */
  const ActionButtons = ({ mobile = false }) => {
    const stop = (e) => { e.stopPropagation(); };
    const accept = (e) => {
      e.stopPropagation();
      if (confirming === "accepted") { setConfirming(null); onAccept?.(); }
      else setConfirming("accepted");
    };
    const reject = (e) => {
      e.stopPropagation();
      if (confirming === "rejected") { setConfirming(null); onReject?.(); }
      else setConfirming("rejected");
    };
    const counter = (e) => {
      e.stopPropagation();
      setConfirming(null);
      onCounter?.();
    };

    if (mobile) {
      return (
        <>
          {onAccept && (
            <button type="button"
              className={`bcv2-btn bcv2-btn-primary${confirming === "accepted" ? " confirming" : ""}`}
              onClick={accept} onKeyDown={stop}>
              {confirming === "accepted" ? "Confirmi?" : "Acceptă"}
            </button>
          )}
          <div className="bcv2-m-btnrow">
            {onCounter && (
              <button type="button" className="bcv2-btn bcv2-btn-secondary" onClick={counter} onKeyDown={stop}>
                Contra-ofertă
              </button>
            )}
            {onReject && (
              <button type="button"
                className={`bcv2-btn bcv2-btn-ghost${confirming === "rejected" ? " confirming" : ""}`}
                onClick={reject} onKeyDown={stop}>
                {confirming === "rejected" ? "Confirmi?" : "Respinge"}
              </button>
            )}
          </div>
        </>
      );
    }

    return (
      <>
        {onAccept && (
          <button type="button"
            className={`bcv2-btn bcv2-btn-primary${confirming === "accepted" ? " confirming" : ""}`}
            onClick={accept} onKeyDown={stop}>
            {confirming === "accepted" ? "Confirmi?" : "Acceptă"}
          </button>
        )}
        {onCounter && (
          <button type="button" className="bcv2-btn bcv2-btn-secondary" onClick={counter} onKeyDown={stop}>
            Contra-ofertă
          </button>
        )}
        {onReject && (
          <button type="button"
            className={`bcv2-btn bcv2-btn-ghost${confirming === "rejected" ? " confirming" : ""}`}
            onClick={reject} onKeyDown={stop}>
            {confirming === "rejected" ? "Confirmi?" : "Respinge"}
          </button>
        )}
      </>
    );
  };

  const FooterText = () => {
    if (skey === "accepted") return <span className="bcv2-footer-text">Acceptat · {resolvedRelative}</span>;
    if (skey === "rejected") return <span className="bcv2-footer-text">Respins · {resolvedRelative}</span>;
    if (skey === "info")     return <span className="bcv2-footer-text">{statusLabel} · {dateLabel}</span>;
    return <span className="bcv2-footer-text">Trimisă {dateLabel} · În așteptare</span>;
  };

  return (
    <div className="bcv2-root" onClick={handleCardClick} onKeyDown={(e) => {
      if (e.key === "Escape") { setConfirming(null); return; }
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCardClick(); }
    }}>
      <article
        className={`bcv2 ${skey}`}
        role="button"
        tabIndex={0}
        aria-label={`Bid ${product} ${harvestYear}, ${formatPrice(price, unit)}, status: ${statusLabel}`}
      >
        {/* Desktop status strip */}
        <div className={`bcv2-strip ${skey}`} aria-hidden="true" />

        {/* Status badge (desktop absolute top-right) */}
        <span className={`bcv2-badge ${skey}`} role="status" aria-label={`Status: ${statusLabel}`}>
          <span className={`bcv2-dot ${skey}`} />
          {statusLabel}
        </span>

        {/* ─── MOBILE: header ─── */}
        <div className="bcv2-m-header">
          <div className="bcv2-m-product">
            <span className="bcv2-m-product-name">{product}</span>
            <span className="bcv2-m-harvest">Recoltă {harvestYear}</span>
          </div>
          <span className={`bcv2-m-badge ${skey}`}>
            <span className={`bcv2-dot ${skey}`} />
            {statusLabel}
          </span>
        </div>

        {/* ─── MOBILE: price + quantity ─── */}
        <div className="bcv2-m-price">
          <div className="bcv2-m-col">
            <span className="bcv2-m-fieldlabel">Preț</span>
            <span className="bcv2-m-price-value">{formatPrice(price, unit)}</span>
          </div>
          <div className="bcv2-m-col right">
            <span className="bcv2-m-fieldlabel">Cantitate</span>
            <span className="bcv2-m-qty-value">{quantity} t</span>
          </div>
        </div>

        {/* ─── MOBILE: meta ─── */}
        <div className="bcv2-m-meta">
          <div className="bcv2-m-meta-row">
            <IconBuilding size={14} />
            <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <span className="bcv2-m-meta-value">{farmerName}</span>
            </div>
          </div>
          <div className="bcv2-m-meta-row">
            <IconCalendar size={14} />
            <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <span className="bcv2-m-meta-sub" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>Perioadă livrare</span>
              <span className="bcv2-m-meta-value">{formatDeliveryShort(bid.delivery_start, bid.delivery_end)}</span>
            </div>
          </div>
          <div className="bcv2-m-meta-row">
            <IconMapPin size={14} />
            <span className="bcv2-m-meta-value">{parityDisplay}</span>
          </div>
        </div>

        {/* ─── MOBILE: footer ─── */}
        <div className="bcv2-m-footer" onClick={(e) => e.stopPropagation()}>
          {showActions ? <ActionButtons mobile /> : <FooterText />}
        </div>

        {/* ─── DESKTOP: product + harvest ─── */}
        <div className="bcv2-section desktop-only">
          <span className="bcv2-label">Produs</span>
          <span className="bcv2-value">{product}</span>
          <span className="bcv2-value small">Recoltă {harvestYear}</span>
        </div>

        {/* ─── DESKTOP: price + qty (matches "first wheat card" dims) ─── */}
        <div className="bcv2-section desktop-only price-col">
          <span className="bcv2-price">{formatPrice(price, unit)}</span>
          <span className="bcv2-qty">{quantity} t</span>
        </div>

        {/* ─── DESKTOP: delivery + parity ─── */}
        <div className="bcv2-section desktop-only">
          <span className="bcv2-label">Livrare</span>
          <span className="bcv2-value">{formatDeliveryShort(bid.delivery_start, bid.delivery_end)}</span>
          <div className="bcv2-parity-row">
            <IconMapPin size={13} />
            <span className="bcv2-value small">{parityDisplay}</span>
          </div>
        </div>

        {/* ─── DESKTOP: company + date ─── */}
        <div className="bcv2-section desktop-only firm">
          <span className="bcv2-label">Fermier</span>
          <span className="bcv2-value" title={farmerName}>{farmerName}</span>
          <span className="bcv2-value small">{dateLabel}</span>
        </div>

        {/* ─── DESKTOP: actions / footer ─── */}
        <div className="bcv2-section desktop-only actions" onClick={(e) => e.stopPropagation()}>
          {showActions ? <ActionButtons /> : <FooterText />}
        </div>
      </article>
    </div>
  );
}
