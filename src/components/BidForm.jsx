// src/components/BidForm.jsx
import { useState } from "react";
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    // Validare paritate
    if ((parity === "FCA" || parity === "FOR") && !freightCost) {
      setLoading(false);
      setError("Completează tariful de transport pentru paritatea selectată.");
      return;
    }

    const qtyNum = Number(quantity);
    const priceNum = Number(price);

    if (!qtyNum || qtyNum <= 0) {
      setLoading(false);
      setError("Introdu o cantitate validă (> 0).");
      return;
    }

    if (!priceNum || priceNum <= 0) {
      setLoading(false);
      setError("Introdu un preț valid (> 0).");
      return;
    }

    if (deliveryEnd && deliveryStart && deliveryEnd < deliveryStart) {
      setLoading(false);
      setError("Data de final nu poate fi înainte de data de start.");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setLoading(false);
      setError("Trebuie să fii logat pentru a trimite un bid.");
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
      freight_cost: freightCost ? Number(freightCost) : null,
      delivery_start: deliveryStart || null,
      delivery_end: deliveryEnd || null,
      status: "pending",
    });

    if (insertError) {
      setLoading(false);
      setError("Eroare la trimiterea bid-ului: " + insertError.message);
      return;
    }

    setMessage("Bid trimis cu succes. Vei fi contactat de trader.");
    setLoading(false);

    // Reset
    setQuantity("");
    setPrice("");
    setParity("CPT");
    setFreightCost("");
    setDeliveryStart("");
    setDeliveryEnd("");

    if (onBidCreated) onBidCreated();
  };

  return (
    <div className="card bid-form-card">
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

        {/* CANTITATE + PREȚ */}
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

        {/* PARITATE + TRANSPORT */}
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

        {/* DATE LIVRARE – NATIV, MOBILE SAFE */}
        <div className="bid-form-grid-2">
          <div>
            <label className="label">Start livrare</label>
            <input
              type="date"
              className="input"
              value={deliveryStart}
              onChange={(e) => setDeliveryStart(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Final livrare</label>
            <input
              type="date"
              className="input"
              value={deliveryEnd}
              onChange={(e) => setDeliveryEnd(e.target.value)}
            />
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
