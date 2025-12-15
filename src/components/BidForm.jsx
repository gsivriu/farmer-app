// src/components/BidForm.jsx
import { useState, useRef } from "react";
import { supabase } from "../supabaseClient";

const PRODUCT_OPTIONS = [
  { value: "wheat", label: "Grâu" },
  { value: "barley", label: "Orz" },
  { value: "corn", label: "Porumb" },
  { value: "rapeseed", label: "Rapiță" },
  { value: "sunflower", label: "Floarea soarelui" },
];

const PARITY_OPTIONS = ["CPT", "DAP", "FCA", "FOR", "FOB", "CIF"];

export default function BidForm({ onBidCreated }) {
  const [product, setProduct] = useState("wheat");
  const isSunflower = product === "sunflower";
  const priceLabel = isSunflower ? "Preț (USD/t)" : "Preț (EUR/t)";

  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [parity, setParity] = useState("CPT");
  const [freightCost, setFreightCost] = useState("");

  const [deliveryStart, setDeliveryStart] = useState("");
  const [deliveryEnd, setDeliveryEnd] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const startRef = useRef(null);
  const endRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    // validare FCA / FOR → trebuie tarif transport
    if ((parity === "FCA" || parity === "FOR") && !freightCost) {
      setLoading(false);
      setError(
        "Te rog completează tariful de transport pentru paritatea selectată."
      );
      return;
    }

    const qtyNum = Number(quantity);
    const priceNum = Number(price);
    const freightNum = freightCost ? Number(freightCost) : null;

    if (!qtyNum || qtyNum <= 0) {
      setLoading(false);
      setError("Te rog introdu o cantitate validă (> 0).");
      return;
    }
    if (!priceNum || priceNum <= 0) {
      setLoading(false);
      setError("Te rog introdu un preț valid (> 0).");
      return;
    }

    // utilizator logat
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setLoading(false);
      setError("Trebuie să fii logat ca să trimiți un bid.");
      return;
    }

    const user = userData.user;

    const { error: insertError } = await supabase.from("bids").insert({
      farmer_id: user.id,
      farmer_email: user.email,
      product,
      quantity: qtyNum,
      price: priceNum,
      parity,
      freight_cost: freightNum,
      delivery_start: deliveryStart || null,
      delivery_end: deliveryEnd || null,
      status: "pending",
    });

    if (insertError) {
      setLoading(false);
      setError("Eroare la trimiterea bid-ului: " + insertError.message);
      return;
    }

    setLoading(false);
    setMessage("Bid trimis cu succes. Vei fi contactat de trader.");

    // reset formular
    setQuantity("");
    setPrice("");
    setParity("CPT");
    setFreightCost("");
    setDeliveryStart("");
    setDeliveryEnd("");

    if (onBidCreated) {
      onBidCreated();
    }
  };

  return (
    <div className="card">
      <h2>Plasează un bid</h2>

      {message && <p className="badge accepted">{message}</p>}
      {error && <p className="badge rejected">{error}</p>}

      <form className="form" onSubmit={handleSubmit}>
        {/* PRODUS */}
        <div>
          <label className="label">Produs</label>
          <select
            className="input"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          >
            {PRODUCT_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* CANTITATE & PREȚ */}
        <div className="bid-form-grid-2">
          <div>
            <label className="label">Cantitate (t)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="ex: 100"
            />
          </div>

          <div>
            <label className="label">{priceLabel}</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.5"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={isSunflower ? "ex: 510" : "ex: 200"}
            />
          </div>
        </div>

        {/* PARITATE + TARIF TRANSPORT */}
        <div className="bid-form-grid-2">
          <div>
            <label className="label">Paritate</label>
            <select
              className="input"
              value={parity}
              onChange={(e) => setParity(e.target.value)}
            >
              {PARITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {(parity === "FCA" || parity === "FOR") && (
            <div>
              <label className="label">Tarif transport (EUR/t)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.5"
                value={freightCost}
                onChange={(e) => setFreightCost(e.target.value)}
                placeholder="ex: 15"
              />
            </div>
          )}
        </div>

        {/* DATE LIVRARE */}
        <div className="bid-form-grid-2">
          <div>
            <label className="label">Start livrare</label>
            <div className="date-wrapper">
              <input
                ref={startRef}
                type="date"
                className="input hidden-date-input"
                value={deliveryStart}
                onChange={(e) => setDeliveryStart(e.target.value)}
              />
              <div
                className="fake-date-display"
                onClick={() => startRef.current?.showPicker?.()}
              >
                {deliveryStart
                  ? new Date(deliveryStart).toLocaleDateString("ro-RO")
                  : "-"}
              </div>
            </div>
          </div>

          <div>
            <label className="label">Final livrare</label>
            <div className="date-wrapper">
              <input
                ref={endRef}
                type="date"
                className="input hidden-date-input"
                value={deliveryEnd}
                onChange={(e) => setDeliveryEnd(e.target.value)}
              />
              <div
                className="fake-date-display"
                onClick={() => endRef.current?.showPicker?.()}
              >
                {deliveryEnd
                  ? new Date(deliveryEnd).toLocaleDateString("ro-RO")
                  : "-"}
              </div>
            </div>
          </div>
        </div>

        <button
          className="btn primary-btn full-width"
          type="submit"
          disabled={loading}
        >
          {loading ? "Se trimite..." : "Trimite bid"}
        </button>
      </form>
    </div>
  );
}
