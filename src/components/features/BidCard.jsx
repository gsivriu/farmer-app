import { getProductLabelSafe } from "../../utils/productLabels";
import { formatCompactNumber, hasPositiveNumber } from "../../utils/numberFormat";
import { formatDeliveryRange, formatLocationDisplay, isFreightParity } from "../../utils/formatting";

// ── Status helper — single source of truth ───────────────────────────────────
export function getStatusStyle(status) {
  const s = String(status || "").toLowerCase();
  if (s === "accepted")
    return { borderColor: "#22C55E", badgeBg: "#DCFCE7", badgeText: "#166534" };
  if (s === "rejected")
    return { borderColor: "#EF4444", badgeBg: "#FEE2E2", badgeText: "#991B1B" };
  if (s === "countered" || s === "farmer_countered")
    return { borderColor: "#3B82F6", badgeBg: "#DBEAFE", badgeText: "#1E40AF" };
  // pending / working
  return { borderColor: "#D4A017", badgeBg: "#FEF3C7", badgeText: "#92400E" };
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

function formatDateOnly(value) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("en-GB", { year: "2-digit", month: "2-digit", day: "2-digit" });
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

// ── BidCard ──────────────────────────────────────────────────────────────────
export default function BidCard({ bid, onClick }) {
  const style = getStatusStyle(bid.status);
  const unit = `${bid.currency || (bid.product === "sunflower" ? "USD" : "EUR")}/t`;
  const { price, isCounter } = resolveDisplayPrice(bid);

  const location = isFreightParity(bid.parity)
    ? formatLocationDisplay(bid.loading_location || "-")
    : formatLocationDisplay(bid.delivery_location || "-");

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
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="bid-card-header">
        <div>
          <div className="bid-card-title">{getProductLabelSafe(bid.product)}</div>
          <div className="bid-card-subtitle">{bid.farmer_email || bid.farmer_id}</div>
        </div>
        <div className="bid-card-status-group">
          <span
            className="bid-card-badge"
            style={{ background: style.badgeBg, color: style.badgeText }}
          >
            {getStatusLabel(bid.status)}
          </span>
          <span className="bid-card-timestamp">{formatDateTime(bid.created_at)}</span>
        </div>
      </div>

      {/* ── Section label ───────────────────────────────────── */}
      <div className="bid-card-section-label">Details</div>

      {/* ── Row 1: Offer Type | Delivery Period ─────────────── */}
      <div className="bid-card-grid">
        <div className="bid-card-cell">
          <span className="bid-card-label">Offer Type</span>
          <span className="bid-card-value">{bid.parity || "-"}</span>
        </div>
        <div className="bid-card-cell bid-card-cell-right">
          <span className="bid-card-label">Delivery Period</span>
          <span className="bid-card-value">
            {formatDeliveryRange(bid.delivery_start, bid.delivery_end)}
          </span>
        </div>
      </div>

      {/* ── Row 2: Price | Location ─────────────────────────── */}
      <div className="bid-card-grid">
        <div className="bid-card-cell">
          <span className="bid-card-label">Price</span>
          <span className={`bid-card-value${isCounter ? " bid-card-counter-value" : ""}`}>
            {formatCompactNumber(price)} {unit}
          </span>
        </div>
        <div className="bid-card-cell bid-card-cell-right">
          <span className="bid-card-label">Location</span>
          <span className="bid-card-value">{location}</span>
        </div>
      </div>

      {/* ── Row 3: Quantity | Commodity ─────────────────────── */}
      <div className="bid-card-grid">
        <div className="bid-card-cell">
          <span className="bid-card-label">Quantity</span>
          <span className="bid-card-value">{formatCompactNumber(bid.quantity)} t</span>
        </div>
        <div className="bid-card-cell bid-card-cell-right">
          <span className="bid-card-label">Commodity</span>
          <span className="bid-card-value">{getProductLabelSafe(bid.product)}</span>
        </div>
      </div>

      {/* ── Row 4: Account | Contract or Date ───────────────── */}
      <div className="bid-card-grid">
        <div className="bid-card-cell">
          <span className="bid-card-label">Account</span>
          <span className="bid-card-value bid-card-value-truncate">
            {bid.farmer_email || bid.farmer_id}
          </span>
        </div>
        <div className="bid-card-cell bid-card-cell-right">
          <span className="bid-card-label">
            {bid.status === "accepted" && bid.contract_no ? "Contract" : "Offer date"}
          </span>
          <span className="bid-card-value">
            {bid.status === "accepted" && bid.contract_no
              ? bid.contract_no
              : formatDateOnly(bid.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
