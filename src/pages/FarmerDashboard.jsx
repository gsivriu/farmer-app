import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

import MarketTicker from "../components/MarketTicker";
import PricesGrid from "../components/PricesGrid";
import BidForm from "../components/BidForm";

import FarmerProgress from "../components/FarmerProgress";


const PRODUCT_LABELS = {
  wheat: "Grâu",
  barley: "Orz",
  corn: "Porumb",
  rapeseed: "Rapiță",
  sunflower: "Floarea soarelui",
};

export default function FarmerDashboard() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("home");

  const loadBids = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setError("Nu am putut identifica utilizatorul curent.");
      setLoading(false);
      return;
    }

    const userId = userData.user.id;

    const { data, error: bidsError } = await supabase
      .from("bids")
      .select("*")
      .eq("farmer_id", userId) // ✅ important
      .order("created_at", { ascending: false });

    if (bidsError) {
      setError("Eroare la încărcarea bid-urilor: " + bidsError.message);
      setLoading(false);
      return;
    }

    setBids(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBids();
  }, [loadBids]);

  // ============================
  // CALCULE: accepted only
  // ============================
  const acceptedBids = useMemo(
    () => bids.filter((b) => b.status === "accepted"),
    [bids]
  );

  const totalQty = useMemo(() => {
    return acceptedBids.reduce((acc, b) => acc + Number(b.quantity || 0), 0);
  }, [acceptedBids]);

  const statsRows = useMemo(() => {
    const map = new Map();

    for (const b of acceptedBids) {
      const product = b.product || "unknown";
      const qty = Number(b.quantity || 0);
      const price =
        b.final_price != null
          ? Number(b.final_price)
          : b.counter_price != null
          ? Number(b.counter_price)
          : Number(b.price || 0);

      const prev = map.get(product) || { totalQty: 0, totalValue: 0 };
      prev.totalQty += qty;
      prev.totalValue += qty * price;
      map.set(product, prev);
    }

    return Array.from(map.entries()).map(([product, v]) => ({
      product,
      totalQty: v.totalQty,
      avgPrice: v.totalQty > 0 ? v.totalValue / v.totalQty : 0,
    }));
  }, [acceptedBids]);

  // ============================
  // ACTIONS (countered bids)
  // ============================
  const handleAcceptCounter = async (bid) => {
    const finalPrice =
      bid.counter_price != null ? Number(bid.counter_price) : Number(bid.price);

    const { error: updErr } = await supabase
      .from("bids")
      .update({ status: "accepted", final_price: finalPrice })
      .eq("id", bid.id);

    if (updErr) {
      window.alert("Eroare la acceptare: " + updErr.message);
      return;
    }

    setBids((prev) =>
      prev.map((x) =>
        x.id === bid.id ? { ...x, status: "accepted", final_price: finalPrice } : x
      )
    );
  };

  const handleRejectCounter = async (bid) => {
    const { error: updErr } = await supabase
      .from("bids")
      .update({ status: "rejected" })
      .eq("id", bid.id);

    if (updErr) {
      window.alert("Eroare la respingere: " + updErr.message);
      return;
    }

    setBids((prev) => prev.map((x) => (x.id === bid.id ? { ...x, status: "rejected" } : x)));
  };

  const handleCounterBack = async (bid) => {
    const lastPrice =
      bid.counter_price != null ? Number(bid.counter_price) : Number(bid.price);

    const input = window.prompt(
      `Introduceți un nou preț (EUR/t).\nUltima ofertă: ${lastPrice} EUR/t`,
      String(lastPrice)
    );

    if (input === null) return;

    const value = Number(input);
    if (!Number.isFinite(value) || value <= 0) {
      window.alert("Introduceți un preț valid.");
      return;
    }

    const { error: updErr } = await supabase
      .from("bids")
      .update({ counter_price: value, status: "countered" })
      .eq("id", bid.id);

    if (updErr) {
      window.alert("Eroare la counter: " + updErr.message);
      return;
    }

    setBids((prev) =>
      prev.map((x) =>
        x.id === bid.id ? { ...x, counter_price: value, status: "countered" } : x
      )
    );
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleString("ro-RO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="app-container">
      <nav className="desktop-nav">
        <button
          type="button"
          className={"nav-item " + (activeTab === "home" ? "active" : "")}
          onClick={() => setActiveTab("home")}
        >
          Home
        </button>
        <button
          type="button"
          className={"nav-item " + (activeTab === "sale" ? "active" : "")}
          onClick={() => setActiveTab("sale")}
        >
          Sale
        </button>
        <button
          type="button"
          className={"nav-item " + (activeTab === "activity" ? "active" : "")}
          onClick={() => setActiveTab("activity")}
        >
          Activitatea mea
        </button>
      </nav>

      <div className="farmer-dashboard-layout">
        <div className={"tab-content " + (activeTab === "home" ? "active" : "")}>
          {/* PROGRESS + MARKET OVERVIEW */}
          <div className="dashboard-row full">
            <div className="card">
              <FarmerProgress />
            </div>
          </div>

          <div className="dashboard-row full">
            <div className="card">
              <MarketTicker />
            </div>
          </div>
        </div>

        <div className={"tab-content " + (activeTab === "sale" ? "active" : "")}>
          {/* PRICES + BID FORM */}
          <div className="dashboard-row full">
            <div className="card">
              <PricesGrid />
            </div>
          </div>

          <div className="dashboard-row full">
            <div className="card no-inner-card">
              <BidForm onBidCreated={loadBids} />
            </div>
          </div>
        </div>

        <div className={"tab-content " + (activeTab === "activity" ? "active" : "")}>
          {/* ACTIVITY */}
          <div className="dashboard-row full">
            <div className="card">
              <div className="card-header">
                <h2 className="market-title">Activitatea mea</h2>
              </div>

              <div className="card-body">
                {loading && <p>Se încarcă datele...</p>}
                {error && <p className="badge rejected">{error}</p>}

                <div className="dashboard-section">
                  <p>
                    <strong>Volum total:</strong>{" "}
                    {Number(totalQty || 0).toFixed(2)} t
                  </p>
                </div>

                <div className="dashboard-section">
                  <h3 style={{ margin: "10px 0 8px", fontSize: 16 }}>
                    Statistici pe produs
                  </h3>

                  {statsRows.length === 0 ? (
                    <p className="small-text">
                      Nu ai încă bid-uri acceptate pentru a calcula statistici.
                    </p>
                  ) : (
                    <div className="table-wrapper">
                      <table className="table stats-table">
                        <thead>
                          <tr>
                            <th>Produs</th>
                            <th>Volum (t)</th>
                            <th>Preț mediu</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statsRows.map((row) => (
                            <tr key={row.product}>
                              <td>{PRODUCT_LABELS[row.product] || row.product}</td>
                              <td>{Number(row.totalQty || 0).toFixed(2)}</td>
                              <td>{Number(row.avgPrice || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="dashboard-section">
                  <h3 style={{ margin: "10px 0 8px", fontSize: 16 }}>
                    Bid-urile mele
                  </h3>

                  {bids.length === 0 ? (
                    <p className="small-text">
                      Nu ai încă bid-uri plasate.
                    </p>
                  ) : (
                    <div className="table-wrapper bids-table">
                      <table className="table wide-table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Produs</th>
                            <th>Cantitate (t)</th>
                            <th>Preț (EUR/t)</th>
                            <th>Livrare</th>
                            <th>Status</th>
                            <th>Acțiuni</th>
                          </tr>
                        </thead>

                        <tbody>
                          {bids.map((b) => {
                            const activePrice =
                              b.counter_price != null
                                ? Number(b.counter_price)
                                : Number(b.price);

                            const isCounteredBid =
                              b.status === "countered";

                            return (
                              <tr key={b.id}>
                                <td>
                                  {formatDateTime(b.created_at)}
                                </td>
                                <td>
                                  {PRODUCT_LABELS[b.product] || b.product}
                                </td>
                                <td>
                                  {Number(b.quantity || 0).toFixed(2)}
                                </td>

                                <td
                                  style={
                                    b.counter_price != null
                                      ? { color: "red", fontWeight: 700 }
                                      : undefined
                                  }
                                >
                                  {Number(activePrice || 0).toFixed(2)}
                                </td>

                                <td>
                                  {b.delivery_start && b.delivery_end
                                    ? `${b.delivery_start} → ${b.delivery_end}`
                                    : "-"}
                                </td>

                                <td>
                                  <span
                                    className={
                                      "badge " +
                                      (b.status === "accepted"
                                        ? "accepted"
                                        : b.status === "rejected"
                                        ? "rejected"
                                        : b.status === "countered"
                                        ? "counter"
                                        : "pending")
                                    }
                                  >
                                    {b.status}
                                  </span>
                                </td>

                                <td>
                                  {isCounteredBid ? (
                                    <div className="actions-vertical">
                                      <button
                                        className="btn small ghost"
                                        onClick={() => handleAcceptCounter(b)}
                                      >
                                        Acceptă
                                      </button>
                                      <button
                                        className="btn small ghost"
                                        onClick={() => handleRejectCounter(b)}
                                      >
                                        Respinge
                                      </button>
                                      <button
                                        className="btn small ghost"
                                        onClick={() => handleCounterBack(b)}
                                      >
                                        Counter
                                      </button>
                                    </div>
                                  ) : (
                                    <span>-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav className="bottom-nav">
        <button
          type="button"
          className={"nav-item " + (activeTab === "home" ? "active" : "")}
          onClick={() => setActiveTab("home")}
        >
          <span>🏠</span>
          Home
        </button>
        <button
          type="button"
          className={"nav-item sale-btn " + (activeTab === "sale" ? "active" : "")}
          onClick={() => setActiveTab("sale")}
        >
          <span>💰</span>
          Sale
        </button>
        <button
          type="button"
          className={"nav-item " + (activeTab === "activity" ? "active" : "")}
          onClick={() => setActiveTab("activity")}
        >
          <span>📊</span>
          Activity
        </button>
      </nav>
    </div>
  );

  
}
