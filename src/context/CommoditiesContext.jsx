import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useRealtimeSubscription } from "../hooks/useRealtimeSubscription";

const initialCommodities = [
  { id: "wheat",     name: "Grâu",              price: 200, basis: "CPT Constanța", lastPrice: null, priceChange: 0, trend: "flat", lastUpdated: null },
  { id: "barley",    name: "Orz",               price: 180, basis: "CPT Constanța", lastPrice: null, priceChange: 0, trend: "flat", lastUpdated: null },
  { id: "corn",      name: "Porumb",             price: 190, basis: "CPT Constanța", lastPrice: null, priceChange: 0, trend: "flat", lastUpdated: null },
  { id: "rapeseed",  name: "Rapiță",             price: 420, basis: "CPT Constanța", lastPrice: null, priceChange: 0, trend: "flat", lastUpdated: null },
  { id: "sunflower", name: "Floarea soarelui",   price: 380, basis: "CPT Constanța", lastPrice: null, priceChange: 0, trend: "flat", lastUpdated: null },
];

const normalizeName = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const CommoditiesContext = createContext(null);

export function CommoditiesProvider({ children }) {
  const [commodities, setCommodities] = useState(initialCommodities);

  const fetchCommodities = useCallback(async () => {
    const { data, error } = await supabase
      .from("commodities")
      .select("name, price, last_updated");

    if (error || !Array.isArray(data)) return;

    const byName = new Map(
      data.map((row) => [
        normalizeName(row.name),
        {
          price: Number(row.price),
          lastUpdated: row.last_updated ? String(row.last_updated) : null,
        },
      ])
    );

    setCommodities((prev) =>
      (prev.length ? prev : initialCommodities).map((c) => {
        const match = byName.get(normalizeName(c.name));
        if (!match || !Number.isFinite(match.price)) return c;
        const oldPrice = Number(c.price || 0);
        const nextPrice = Number(match.price);
        const nextUpdated = match.lastUpdated;
        if (nextUpdated && c.lastUpdated && nextUpdated === c.lastUpdated) return c;
        const diff = nextPrice - oldPrice;
        const trend = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
        return {
          ...c,
          price: nextPrice,
          lastPrice: oldPrice,
          priceChange: diff === 0 ? 0 : diff,
          trend,
          lastUpdated: nextUpdated || c.lastUpdated,
        };
      })
    );
  }, []);

  useEffect(() => { fetchCommodities(); }, [fetchCommodities]);
  useRealtimeSubscription("commodities", fetchCommodities);

  const updateCommodityPrice = async (id, newPrice) => {
    const target = commodities.find((c) => c.id === id);
    const targetName = target?.name || id;
    const updatedAt = new Date().toISOString();

    const { error } = await supabase
      .from("commodities")
      .upsert(
        { name: targetName, price: newPrice, last_updated: updatedAt },
        { onConflict: "name" }
      );

    if (error) return { error };

    setCommodities((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const oldPrice = Number(c.price || 0);
        const nextPrice = Number(newPrice);
        const diff = nextPrice - oldPrice;
        const trend = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
        return {
          ...c,
          price: nextPrice,
          lastPrice: oldPrice,
          priceChange: diff === 0 ? 0 : diff,
          trend,
          lastUpdated: updatedAt,
        };
      })
    );

    return { error: null };
  };

  return (
    <CommoditiesContext.Provider value={{ commodities, fetchCommodities, updateCommodityPrice }}>
      {children}
    </CommoditiesContext.Provider>
  );
}

export function useCommoditiesContext() {
  const ctx = useContext(CommoditiesContext);
  if (!ctx) throw new Error("useCommoditiesContext must be used inside <CommoditiesProvider />");
  return ctx;
}
