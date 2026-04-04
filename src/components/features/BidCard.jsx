import { getProductLabelSafe } from "../../utils/productLabels";
import { formatCompactNumber, hasPositiveNumber } from "../../utils/numberFormat";
import { formatDeliveryRange, formatLocationDisplay, isFreightParity } from "../../utils/formatting";

// ── Status helper — single source of truth ───────────────────────────────────
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
  if (s === "accepted")          return "Accepted";
  if (s === "rejected")          return "Rejected";
  if (s === "countered")         return "Counter offer";
  if (s === "farmer_countered")  return "Farmer counter";
  return "Pending";
}

function formatDateTime(value) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("en-GB", {
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
  const style = getStatusStyle(bid.status);
  const unit = `${bid.currency || (bid.product === "sunflower" ? "USD" : "EUR")}/t`;
  const { price, isCounter } = resolveDisplayPrice(bid);
  const isActionable = ACTIONABLE.has(String(bid.status || "").toLowerCase());

  const location = isFreightParity(bid.parity)
    ? formatLocationDisplay(bid.loading_location || "-")
    : formatLocationDisplay(bid.delivery_location || "-");

  const parityDisplay = bid.parity
    ? (location && location !== "-" ? `${bid.parity} ${location}` : bid.parity)
    : "-";

  return (
    <div
      role="button"
      tabIndex={0}
      className="bid-card"
      style={{ borderLeft: `4px solid ${style.borderColor}` }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); }
      }}
    >

      {/* ── Body: 2-column grid ── */}
      <div className="bc-body">

        {/* Row 1: Commodity | Status */}
        <div className="bc-field">
          <span className="bc-label">Commodity</span>
          <span className="bc-val bc-val-product">
            {getProductLabelSafe(bid.product)}
          </span>
        </div>
        <div className="bc-field bc-field-right bc-field-status">
          <span className="bc-label bc-label-status">Status</span>
          <span
            className="bc-badge"
            style={{ background: style.badgeBg, color: style.badgeText }}
          >
            {getStatusLabel(bid.status)}
          </span>
        </div>

        {/* Row 2: Farmer | Offer date */}
        <div className="bc-field">
          <span className="bc-label">Farmer</span>
          <span className="bc-val bc-val-truncate">{bid.farmer_email || bid.farmer_id || "-"}</span>
        </div>
        <div className="bc-field bc-field-right">
          <span className="bc-label">Offer date</span>
          <span className="bc-val">{formatDateTime(bid.created_at)}</span>
        </div>

        {/* Row 3: Price | Delivery period */}
        <div className="bc-field">
          <span className="bc-label">Price</span>
          <span className={`bc-val bc-val-price${isCounter ? " bc-val-counter" : ""}`}>
            {formatCompactNumber(price)}{" "}
            <span className="bc-val-unit">{unit}</span>
          </span>
        </div>
        <div className="bc-field bc-field-right">
          <span className="bc-label">Delivery</span>
          <span className="bc-val">{formatDeliveryRange(bid.delivery_start, bid.delivery_end)}</span>
        </div>

        {/* Row 4: Parity | Crop year */}
        <div className="bc-field">
          <span className="bc-label">Parity</span>
          <span className="bc-val">{parityDisplay}</span>
        </div>
        <div className="bc-field bc-field-right">
          <span className="bc-label">Crop year</span>
          <span className="bc-val">{bid.crop_year || "-"}</span>
        </div>

      </div>

      {/* ── Action bar (only when actionable) ── */}
      {isActionable && (onAccept || onReject || onCounter) && (
        <div
          className="bc-actions-bar"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {onReject && (
            <button type="button" className="bc-btn bc-btn-reject"
              onClick={(e) => { e.stopPropagation(); onReject(); }}>
              Reject
            </button>
          )}
          {onCounter && (
            <button type="button" className="bc-btn bc-btn-counter"
              onClick={(e) => { e.stopPropagation(); onCounter(); }}>
              Counter
            </button>
          )}
          {onAccept && (
            <button type="button" className="bc-btn bc-btn-accept"
              onClick={(e) => { e.stopPropagation(); onAccept(); }}>
              Accept
            </button>
          )}
        </div>
      )}

    </div>
  );
}
