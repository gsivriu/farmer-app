import React from "react";
import { useAppContext } from "../context/AppContext.jsx";

export default function BidList({ bids, isAdmin }) {
  const { updateBidStatus } = useAppContext();

  // =====================================================================
  // HELPERS
  // =====================================================================

  const formatDateDMY = (value) => {
    if (!value) return "-";
    const str = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const [y, m, d] = str.slice(0, 10).split("-");
      return `${d}/${m}/${y}`;
    }
    const dt = new Date(str);
    if (Number.isNaN(dt.getTime())) return str;
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yyyy = String(dt.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  };

  const formatDeliveryPeriod = (value) => {
    if (!value) return "-";
    const str = String(value);
    if (str.includes("→")) {
      const [start, end] = str.split("→").map((part) => part.trim());
      return `${formatDateDMY(start)} - ${formatDateDMY(end)}`;
    }
    return formatDateDMY(str);
  };

  // Preț activ de negociere (counter dacă există, altfel preț inițial)
  const getNegotiatedPrice = (bid) => bid.counterPrice ?? bid.price;

  // =====================================================================
  // LOGIC BUTTONS
  // =====================================================================

  const handleAccept = (bid) => {
    const finalPrice = getNegotiatedPrice(bid);
    updateBidStatus(bid.id, "Completed", finalPrice);
  };

  const handleReject = (bidId) => {
    updateBidStatus(bidId, "Rejected");
  };

  const handleCounter = (bid) => {
    const lastPrice = getNegotiatedPrice(bid);

    const input = window.prompt(
      `Introduceți un nou preț (EUR/t).\nUltima ofertă: ${lastPrice} EUR/t`,
      lastPrice
    );

    if (input === null) return;

    const value = Number(input);
    if (!Number.isFinite(value) || value <= 0) {
      window.alert("Introduceți un preț valid.");
      return;
    }

    updateBidStatus(bid.id, "Counter Offer", value);
  };

  const renderActions = (bid) => {
    if (bid.status === "Completed" || bid.status === "Rejected")
      return <span>-</span>;

    if (isAdmin) {
      return (
        <>
          <button className="btn small" onClick={() => handleAccept(bid)}>
            Accept
          </button>{" "}
          <button className="btn small" onClick={() => handleReject(bid.id)}>
            Reject
          </button>{" "}
          <button className="btn small" onClick={() => handleCounter(bid)}>
            Counter
          </button>
        </>
      );
    }

    if (bid.status === "Counter Offer") {
      return (
        <>
          <button className="btn small" onClick={() => handleAccept(bid)}>
            Acceptă
          </button>{" "}
          <button className="btn small" onClick={() => handleReject(bid.id)}>
            Respinge
          </button>{" "}
          <button className="btn small" onClick={() => handleCounter(bid)}>
            Counter
          </button>
        </>
      );
    }

    return <span>-</span>;
  };

  // =====================================================================
  // DESKTOP ROW (AICI MODIFICĂM)
  // =====================================================================

  const renderDesktopRow = (bid) => {
    const negotiated = getNegotiatedPrice(bid);

    const isCounterDifferent =
      bid.counterPrice !== null && bid.counterPrice !== bid.price;

    return (
      <tr key={bid.id}>
        <td>{bid.farmerName}</td>
        <td>{bid.product}</td>

        {/* PREȚ INIȚIAL (Fermier) */}
        <td>{bid.price} EUR/t</td>

        {/* NOUA COLUMNĂ – Counter Price */}
        <td
          style={{
            color: isCounterDifferent ? "red" : "#555",
            fontWeight: isCounterDifferent ? "700" : "400",
          }}
        >
          {bid.counterPrice ? `${bid.counterPrice} EUR/t` : "-"}
        </td>

        <td>{bid.quantity}</td>
        <td>{formatDeliveryPeriod(bid.deliveryPeriod)}</td>

        <td>
          <span
            className={
              "badge " +
              (bid.status === "Pending"
                ? "pending"
                : bid.status === "Completed"
                ? "accepted"
                : bid.status === "Rejected"
                ? "rejected"
                : "counter")
            }
          >
            {bid.status}
          </span>
        </td>

        <td>{renderActions(bid)}</td>
      </tr>
    );
  };

  // =====================================================================
  // MOBILE CARD (AICI MODIFICĂM)
  // =====================================================================

  const renderMobileCard = (bid) => {
    const negotiated = getNegotiatedPrice(bid);
    const isCounterDifferent =
      bid.counterPrice !== null && bid.counterPrice !== bid.price;

    return (
      <div key={bid.id} className="mobile-bid-card">
        <div>
          <strong>{bid.farmerName}</strong> – {bid.product}
        </div>

        {/* Preț inițial */}
        <div>Preț inițial: {bid.price} EUR/t</div>

        {/* Counter price roșu */}
        <div
          style={{
            color: isCounterDifferent ? "red" : "#555",
            fontWeight: isCounterDifferent ? "700" : "400",
          }}
        >
          Counter: {bid.counterPrice ?? "-"}
        </div>

        <div>Cantitate: {bid.quantity} t</div>
        <div>Perioadă: {formatDeliveryPeriod(bid.deliveryPeriod)}</div>
        <div>Status: {bid.status}</div>

        <div className="mobile-actions">{renderActions(bid)}</div>
      </div>
    );
  };

  // =====================================================================
  // MAIN RENDER
  // =====================================================================

  if (!bids || bids.length === 0) {
    return <p>Nu există bid-uri de afișat încă.</p>;
  }

  return (
    <div>
      {/* DESKTOP TABLE */}
      <div className="table-wrapper desktop-only">
        <table className="table">
          <thead>
            <tr>
              <th>Fermier</th>
              <th>Produs</th>
              <th>Preț inițial</th>
              <th>Counter Price</th> {/* <--- NOU */}
              <th>Cantitate</th>
              <th>Livrare</th>
              <th>Status</th>
              <th>Acțiuni</th>
            </tr>
          </thead>
          <tbody>{bids.map((bid) => renderDesktopRow(bid))}</tbody>
        </table>
      </div>

      {/* MOBILE VIEW */}
      <div className="mobile-only">
        {bids.map((bid) => renderMobileCard(bid))}
      </div>
    </div>
  );
}
