import { useState } from "react";
import { getProductLabelSafe } from "../../utils/productLabels";
import { formatCompactNumber, hasPositiveNumber } from "../../utils/numberFormat";
import { formatDeliveryRange, formatLocationDisplay, isFreightParity } from "../../utils/formatting";

// ── Status helpers — single source of truth ──────────────────────────────────
export function getStatusStyle(status) {
  const s = String(status || "").toLowerCase();
  if (s === "accepted")
    return { borderColor: "#22C55E", badgeBg: "#DCFCE7", badgeText: "#166534", productColor: "#16a34a" };
  if (s === "rejected")
    return { borderColor: "#EF4444", badgeBg: "#FEE2E2", badgeText: "#991B1B", productColor: "#dc2626" };
  if (s === "countered" || s === "farmer_countered")
    return { borderColor: "#3B82F6", badgeBg: "#DBEAFE", badgeText: "#1E40AF", productColor: "#2563eb" };
  // pending / working
  return { borderColor: "#D4A017", badgeBg: "#FEF3C7", badgeText: "#92400E", productColor: "#b45309" };
}

function getStatusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "accepted")          return "Acceptată";
  if (s === "rejected")          return "Respinsă";
  if (s === "countered")         return "Contra-ofertă";
  if (s === "farmer_countered")  return "Răspuns fermier";
  return "În așteptare";
}

function getStatusToneClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "accepted") return "bc-tone-success";
  if (s === "rejected") return "bc-tone-error";
  if (s === "countered" || s === "farmer_countered") return "bc-tone-info";
  return "bc-tone-warning";
}

function formatDateTime(value) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("ro-RO", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function resolveDisplayPrice(bid) {
  const s = String(bid.status || "").toLowerCase();
  if (s === "accepted" || s === "rejected") {
    const p = bid.final_price ?? (hasPositiveNumber(bid.counter_price) ? bid.counter_price : bid.price);
    return { price: p, isCounter: false };
  }
  if (hasPositiveNumber(bid.counter_price)) return { price: bid.counter_price, isCounter: true };
  return { price: bid.price, isCounter: false };
}

// Statuses where trader can take action
const ACTIONABLE = new Set(["pending", "farmer_countered"]);

// ── BidCard ──────────────────────────────────────────────────────────────────
export default function BidCard({ bid, onClick, onAccept, onReject, onCounter }) {
  const [confirming, setConfirming] = useState(null); // null | "accepted" | "rejected"
  const toneClass = getStatusToneClass(bid.status);
  const unit = `${bid.currency || (bid.product === "sunflower" ? "USD" : "EUR")}/t`;
  const { price, isCounter } = resolveDisplayPrice(bid);
  const isActionable = ACTIONABLE.has(String(bid.status || "").toLowerCase());

  const location = isFreightParity(bid.parity)
    ? formatLocationDisplay(bid.loading_location || "-")
    : formatLocationDisplay(bid.delivery_location || "-");

  const parityDisplay = bid.parity
    ? (location && location !== "-" ? `${bid.parity} ${location}` : bid.parity)
    : "-";

  const handleCardClick = () => {
    if (confirming) { setConfirming(null); return; }
    onClick?.();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`bid-card ${toneClass}`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Escape") { setConfirming(null); return; }
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCardClick(); }
      }}
    >
      <div className="bc-body">

        {/* ── 1. Header: status + date ── */}
        <div className="bc-header">
          <span className="bc-status">
            <span className="bc-status-dot" />
            {getStatusLabel(bid.status)}
          </span>
          <time className="bc-date">{formatDateTime(bid.created_at)}</time>
        </div>

        {/* ── 2. Hero: commodity + price ── */}
        <div className="bc-hero">
          <div className="bc-commodity">
            <div className="bc-commodity-name">{getProductLabelSafe(bid.product)}</div>
            <div className="bc-commodity-meta">An recoltă {bid.crop_year || "-"}</div>
          </div>
          <div className={`bc-price${isCounter ? " bc-price-counter" : ""}`}>
            <span className="bc-price-value">{formatCompactNumber(price)}</span>
            <span className="bc-price-unit">{unit}</span>
          </div>
        </div>

        {/* ── 3. Meta grid: 3 columns ── */}
        <div className="bc-meta">
          <div className="bc-meta-item">
            <span className="bc-meta-label">Fermier</span>
            <span className="bc-meta-value bc-truncate">{bid.farmer_email || bid.farmer_id || "-"}</span>
          </div>
          <div className="bc-meta-item">
            <span className="bc-meta-label">Livrare</span>
            <span className="bc-meta-value">{formatDeliveryRange(bid.delivery_start, bid.delivery_end)}</span>
          </div>
          <div className="bc-meta-item">
            <span className="bc-meta-label">Paritate</span>
            <span className="bc-meta-value bc-truncate">{parityDisplay}</span>
          </div>
        </div>

      </div>

      {/* ── 4. Action bar — neutral equal buttons ── */}
      {isActionable && (onAccept || onReject || onCounter) && (
        <div
          className="bc-actions"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {onReject && (
            <button
              type="button"
              className={`bc-btn${confirming === "rejected" ? " bc-btn-confirming" : confirming ? " bc-btn-dimmed" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                if (confirming === "rejected") { setConfirming(null); onReject(); }
                else setConfirming("rejected");
              }}
            >
              {confirming === "rejected" ? "Confirmi?" : "Respinge"}
            </button>
          )}
          {onCounter && (
            <button
              type="button"
              className={`bc-btn${confirming ? " bc-btn-dimmed" : ""}`}
              onClick={(e) => { e.stopPropagation(); setConfirming(null); onCounter(); }}
            >
              Contra-ofertă
            </button>
          )}
          {onAccept && (
            <button
              type="button"
              className={`bc-btn${confirming === "accepted" ? " bc-btn-confirming" : confirming ? " bc-btn-dimmed" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                if (confirming === "accepted") { setConfirming(null); onAccept(); }
                else setConfirming("accepted");
              }}
            >
              {confirming === "accepted" ? "Confirmi?" : "Acceptă"}
            </button>
          )}
        </div>
      )}

    </div>
  );
}
