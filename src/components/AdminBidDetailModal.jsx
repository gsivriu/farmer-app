import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { getProductLabelSafe } from "../utils/productLabels";
import { formatCompactNumber, hasPositiveNumber } from "../utils/numberFormat";
import { formatDeliveryRange, formatLocationDisplay, isFreightParity } from "../utils/formatting";

const formatDateTime = (value) => {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("ro-RO", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
};

const getStatusLabel = (status) => {
  const value = String(status || "").toLowerCase();
  if (value === "accepted") return "Acceptat";
  if (value === "rejected") return "Respins";
  if (value === "countered") return "Contra-ofertă";
  if (value === "farmer_countered") return "Răspuns fermier";
  return "În așteptare";
};

const getAcceptedPrice = (bid) => {
  if (!bid) return null;
  const raw = bid.final_price != null
    ? bid.final_price
    : hasPositiveNumber(bid.counter_price)
      ? bid.counter_price
      : bid.price;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
};

const formatParityDisplay = (bid, { detailed = false } = {}) => {
  if (!bid?.parity) return "-";
  const parity = String(bid.parity).toUpperCase();
  const delivery = formatLocationDisplay(bid.delivery_location || "-");
  const loading = formatLocationDisplay(bid.loading_location || "-");
  if (parity === "FCA" || parity === "FOB" || parity === "FOR") {
    return detailed
      ? `${parity} ${loading} cu livrare la ${delivery}`
      : `${parity} ${loading} la ${delivery}`;
  }
  return `${parity} ${delivery}`;
};

const parseOptionalNumber = (value) => {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : NaN;
};

const normalizeOptionalText = (value) => {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

function BidStatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  if (s === "accepted")         return <span className="bid-status-badge bid-status-accepted">Acceptat</span>;
  if (s === "rejected")         return <span className="bid-status-badge bid-status-rejected">Respins</span>;
  if (s === "countered")        return <span className="bid-status-badge bid-status-countered">Contra-ofertă</span>;
  if (s === "farmer_countered") return <span className="bid-status-badge bid-status-countered">Răspuns fermier</span>;
  return <span className="bid-status-badge bid-status-pending">În așteptare</span>;
}

export default function AdminBidDetailModal({ bid, onClose, onUpdated }) {
  const [counter, setCounter] = useState("");
  const [freight, setFreight] = useState("");
  const [delivery, setDelivery] = useState("");
  const [original, setOriginal] = useState({ counter: "", freight: "", delivery: "" });
  const [confirmAction, setConfirmAction] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [deliveryLocations, setDeliveryLocations] = useState([]);

  useEffect(() => {
    if (!bid) return;
    const counterValue = Number(bid.counter_price || 0) > 0 ? String(bid.counter_price) : "";
    const freightValue = Number(bid.freight_cost || 0) > 0 ? String(bid.freight_cost) : "";
    const deliveryValue = bid.delivery_location ?? "";
    setCounter(counterValue);
    setFreight(freightValue);
    setDelivery(deliveryValue);
    setOriginal({ counter: counterValue, freight: freightValue, delivery: deliveryValue });
    setConfirmAction(null);
    setModalError(null);
  }, [bid]);

  useEffect(() => {
    supabase
      .from("silo_price_configs")
      .select("silo_name")
      .order("silo_name", { ascending: true })
      .then(({ data, error }) => {
        if (error) return;
        const map = new Map();
        (data || []).forEach((row) => {
          if (row?.silo_name) map.set(row.silo_name, true);
        });
        setDeliveryLocations(["Port Constanța", ...Array.from(map.keys())]);
      });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!bid) return null;

  const getMissingFreightMessage = (freightValue, deliveryValue) => {
    if (!isFreightParity(bid.parity)) return null;
    const freightRaw =
      freightValue != null && String(freightValue).trim() !== "" ? freightValue : bid.freight_cost;
    const deliveryRaw =
      deliveryValue != null && String(deliveryValue).trim() !== "" ? deliveryValue : bid.delivery_location;
    const freightNum = Number(freightRaw);
    const hasFreight =
      freightRaw != null &&
      String(freightRaw).trim() !== "" &&
      Number.isFinite(freightNum) &&
      freightNum > 0;
    const hasDelivery = String(deliveryRaw || "").trim() !== "";
    if (!hasFreight && !hasDelivery)
      return "Oferta nu a fost trimisă. Completează tariful de transport și locația de livrare.";
    if (!hasFreight) return "Oferta nu a fost trimisă. Completează tariful de transport.";
    if (!hasDelivery) return "Oferta nu a fost trimisă. Completează locația de livrare.";
    return null;
  };

  const submit = async (action) => {
    if (isFreightParity(bid.parity)) {
      const missingMessage = getMissingFreightMessage(freight, delivery);
      if (missingMessage) {
        setModalError(missingMessage);
        return;
      }
    }

    const payload = { status: action };
    if (action === "accepted") {
      // Freeze the agreed price into final_price, the same way the farmer's
      // accept path does, so it stays correct even if counter_price is edited
      // later. For a countered bid this is the standing counter; for a plain
      // pending bid it is the farmer's asking price.
      const acceptedPrice = getAcceptedPrice(bid);
      if (acceptedPrice != null) payload.final_price = acceptedPrice;
    }
    if (action === "countered") {
      const counterNum = parseOptionalNumber(counter);
      if (!Number.isFinite(counterNum) || counterNum <= 0) {
        setModalError("Introdu un preț de contra-ofertă valid.");
        return;
      }
      payload.counter_price = counterNum;
      if (isFreightParity(bid.parity)) {
        const freightNum = parseOptionalNumber(freight);
        if (!Number.isFinite(freightNum) || freightNum <= 0) {
          setModalError("Introdu un tarif de transport valid.");
          return;
        }
        payload.freight_cost = freightNum;
        payload.delivery_location = normalizeOptionalText(delivery);
      }
    }

    setModalError(null);
    const { error } = await supabase.from("bids").update(payload).eq("id", bid.id);
    if (error) {
      setModalError("Eroare la trimiterea actualizării: " + error.message);
      return;
    }

    if (typeof onUpdated === "function") await onUpdated();
    onClose();
  };

  const currentCounter = parseOptionalNumber(counter);
  const originalCounter = parseOptionalNumber(original.counter);
  const currentFreight = parseOptionalNumber(freight);
  const originalFreight = parseOptionalNumber(original.freight);
  const currentDelivery = normalizeOptionalText(delivery);
  const originalDelivery = normalizeOptionalText(original.delivery);
  // Only the terminal states lock the admin out. A 'countered' bid (the admin
  // already sent a counter and is waiting on the farmer) stays actionable: the
  // admin can still accept, re-counter, or withdraw it — otherwise a farmer who
  // never responds leaves the offer stuck forever with no admin recourse.
  const isDecisionLocked =
    bid.status === "accepted" || bid.status === "rejected";
  const counterInvalid = currentCounter != null && !Number.isFinite(currentCounter);
  const freightInvalid =
    isFreightParity(bid.parity) && currentFreight != null && !Number.isFinite(currentFreight);
  const counterChanged =
    counterInvalid ||
    (currentCounter == null && originalCounter != null) ||
    (currentCounter != null && originalCounter == null) ||
    (Number.isFinite(currentCounter) &&
      Number.isFinite(originalCounter) &&
      currentCounter !== originalCounter);
  const freightChanged =
    isFreightParity(bid.parity) &&
    (freightInvalid ||
      (currentFreight == null && originalFreight != null) ||
      (currentFreight != null && originalFreight == null) ||
      (Number.isFinite(currentFreight) &&
        Number.isFinite(originalFreight) &&
        currentFreight !== originalFreight));
  const deliveryChanged =
    isFreightParity(bid.parity) && currentDelivery !== originalDelivery;
  const hasChanges = counterChanged || freightChanged || deliveryChanged;

  return (
    <div
      className="bid-modal-backdrop bid-modal-backdrop-details"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bid-modal bid-modal-details"
        onClick={(event) => {
          event.stopPropagation();
          setConfirmAction(null);
        }}
      >
        <div className="bid-detail-drag" aria-hidden="true" />
        <div className="bid-modal-header">
          <div className="bid-detail-header-left">
            <div className="bid-detail-title-row">
              <h3 className="bid-detail-title">{getProductLabelSafe(bid.product)}</h3>
              <BidStatusBadge status={bid.status} />
            </div>
            <span className="bid-detail-date">{formatDateTime(bid.created_at)}</span>
          </div>
          <button type="button" className="bid-detail-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="bid-modal-body">
          <div className="bid-modal-row">
            <span className="bid-modal-label">Fermier</span>
            <span className="bid-modal-value">{bid.farmer_email || bid.farmer_id}</span>
          </div>
          <div className="bid-modal-row">
            <span className="bid-modal-label">Produs</span>
            <span className="bid-modal-value">{getProductLabelSafe(bid.product)}</span>
          </div>
          <div className="bid-modal-row">
            <span className="bid-modal-label">Cantitate</span>
            <span className="bid-modal-value">{formatCompactNumber(bid.quantity)} t</span>
          </div>
          <div className="bid-modal-row">
            <span className="bid-modal-label">Preț</span>
            <span className="bid-modal-value">
              {bid.status === "accepted" && getAcceptedPrice(bid) != null ? (
                <>
                  {formatCompactNumber(getAcceptedPrice(bid))}{" "}
                  {`${bid.currency || (bid.product === "sunflower" ? "USD" : "EUR")}/t`}
                </>
              ) : hasPositiveNumber(bid.counter_price) ? (
                <>
                  {formatCompactNumber(bid.counter_price)}{" "}
                  {`${bid.currency || (bid.product === "sunflower" ? "USD" : "EUR")}/t`}
                </>
              ) : (
                <>
                  {formatCompactNumber(bid.price)}{" "}
                  {`${bid.currency || (bid.product === "sunflower" ? "USD" : "EUR")}/t`}
                </>
              )}
            </span>
          </div>
          <div className="bid-modal-row">
            <span className="bid-modal-label">Contra-ofertă</span>
            <span className="bid-modal-value bid-modal-counter">
              <input
                className="bid-detail-counter-input"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="-"
                value={counter}
                onChange={(e) => setCounter(e.target.value)}
              />
              <span className="bid-modal-unit">
                {`${bid.currency || (bid.product === "sunflower" ? "USD" : "EUR")}/t`}
              </span>
            </span>
          </div>
          {isFreightParity(bid.parity) && (
            <div className="bid-modal-row">
              <span className="bid-modal-label">Transport</span>
              <span className="bid-modal-value bid-modal-counter">
                <input
                  className="bid-detail-counter-input"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="-"
                  value={freight}
                  onChange={(e) => setFreight(e.target.value)}
                />
                <span className="bid-modal-unit">
                  {`${bid.currency || (bid.product === "sunflower" ? "USD" : "EUR")}/t`}
                </span>
              </span>
            </div>
          )}
          <div className="bid-modal-row">
            <span className="bid-modal-label">Paritate</span>
            <span className="bid-modal-value">
              {isFreightParity(bid.parity) ? (
                <span className="bid-modal-parity-edit">
                  <span>
                    {String(bid.parity || "").toUpperCase()}{" "}
                    {bid.loading_location || "-"}
                  </span>
                  <span className="bid-modal-parity-separator">la</span>
                  <select
                    className="input inline-select bid-modal-inline-select"
                    value={delivery}
                    onChange={(e) => setDelivery(e.target.value)}
                  >
                    <option value="">Locație livrare</option>
                    {delivery && !deliveryLocations.includes(delivery) && (
                      <option value={delivery}>{formatLocationDisplay(delivery)}</option>
                    )}
                    {deliveryLocations.map((loc) => (
                      <option key={loc} value={loc}>{formatLocationDisplay(loc)}</option>
                    ))}
                  </select>
                </span>
              ) : (
                formatParityDisplay(bid, { detailed: true })
              )}
            </span>
          </div>
          <div className="bid-modal-row">
            <span className="bid-modal-label">Livrare</span>
            <span className="bid-modal-value">
              {formatDeliveryRange(bid.delivery_start, bid.delivery_end)}
            </span>
          </div>
          {bid.crop_year && (
            <div className="bid-modal-row">
              <span className="bid-modal-label">An recoltă</span>
              <span className="bid-modal-value">{bid.crop_year}</span>
            </div>
          )}
          {bid.quantity_tolerance != null && (
            <div className="bid-modal-row">
              <span className="bid-modal-label">Toleranță</span>
              <span className="bid-modal-value">±{bid.quantity_tolerance}%</span>
            </div>
          )}
          {bid.remarks && (
            <div className="bid-modal-row">
              <span className="bid-modal-label">Observații</span>
              <span className="bid-modal-value">{bid.remarks}</span>
            </div>
          )}
          <div className="bid-modal-row">
            <span className="bid-modal-label">Stare</span>
            <span className="bid-modal-value">{getStatusLabel(bid.status)}</span>
          </div>
          {bid.status === "accepted" && bid.contract_no && (
            <div className="bid-modal-row">
              <span className="bid-modal-label">Contract</span>
              <span className="bid-modal-value">{bid.contract_no}</span>
            </div>
          )}
        </div>
        {modalError && (
          <div className="modal-inline-error" role="alert">
            {modalError}
          </div>
        )}
        <div className="bid-detail-footer">
          <button
            type="button"
            className={`bid-action-reject${confirmAction === "rejected" ? " is-confirming" : ""}`}
            disabled={isDecisionLocked}
            onClick={(event) => {
              event.stopPropagation();
              if (confirmAction !== "rejected") {
                setConfirmAction("rejected");
                return;
              }
              submit("rejected");
            }}
          >
            {confirmAction === "rejected" ? "Confirmi?" : "Respinge"}
          </button>
          <button
            type="button"
            className={`bid-action-counter${confirmAction === "countered" ? " is-confirming" : ""}`}
            disabled={isDecisionLocked || !hasChanges || counterInvalid || freightInvalid}
            onClick={(event) => {
              event.stopPropagation();
              if (confirmAction !== "countered") {
                setConfirmAction("countered");
                return;
              }
              submit("countered");
            }}
          >
            {confirmAction === "countered" ? "Confirmi?" : "Contra-ofertă"}
          </button>
          <button
            type="button"
            className={`bid-action-accept${confirmAction === "accepted" ? " is-confirming" : ""}`}
            disabled={isDecisionLocked || hasChanges}
            onClick={(event) => {
              event.stopPropagation();
              if (confirmAction !== "accepted") {
                setConfirmAction("accepted");
                return;
              }
              submit("accepted");
            }}
          >
            {confirmAction === "accepted" ? "Confirmi?" : "Acceptă"}
          </button>
        </div>
      </div>
    </div>
  );
}
