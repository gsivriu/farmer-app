import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

const AppContext = createContext(null);


// Lista inițială de produse + prețuri de pornire
const initialCommodities = [
  {
    id: "wheat",
    name: "Grâu",
    price: 200,
    basis: "CPT Constanța",
    lastPrice: null,
    priceChange: 0,
    trend: "flat", // "up" | "down" | "flat"
    lastUpdated: null,
  },
  {
    id: "barley",
    name: "Orz",
    price: 180,
    basis: "CPT Constanța",
    lastPrice: null,
    priceChange: 0,
    trend: "flat",
    lastUpdated: null,
  },
  {
    id: "corn",
    name: "Porumb",
    price: 190,
    basis: "CPT Constanța",
    lastPrice: null,
    priceChange: 0,
    trend: "flat",
    lastUpdated: null,
  },
  {
    id: "rapeseed",
    name: "Rapiță",
    price: 420,
    basis: "CPT Constanța",
    lastPrice: null,
    priceChange: 0,
    trend: "flat",
    lastUpdated: null,
  },
  {
    id: "sunflower",
    name: "Floarea soarelui",
    price: 380,
    basis: "CPT Constanța",
    lastPrice: null,
    priceChange: 0,
    trend: "flat",
    lastUpdated: null,
  },
];

const normalizeName = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function AppProvider({ children }) {
  // utilizatorul curent: { name, role: "farmer" | "admin" }
  const [currentUser, setCurrentUser] = useState(null);

  // prețuri zilnice la produse
  const [commodities, setCommodities] = useState(initialCommodities);

  // lista de bid-uri
  const [bids, setBids] = useState([]);
  const [farmerRewards, setFarmerRewards] = useState({});

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
        if (nextUpdated && c.lastUpdated && nextUpdated === c.lastUpdated) {
          return c;
        }
        const diff = nextPrice - oldPrice;
        let trend = "flat";
        if (diff > 0) trend = "up";
        else if (diff < 0) trend = "down";

        return {
          ...c,
          price: nextPrice,
          lastPrice: oldPrice,
          priceChange: diff,
          trend,
          lastUpdated: nextUpdated || c.lastUpdated,
        };
      })
    );
  }, []);

  useEffect(() => {
    fetchCommodities();
  }, [fetchCommodities]);

  useEffect(() => {
    const commoditiesSubscription = supabase
      .channel("public:commodities")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "commodities" },
        () => {
          fetchCommodities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commoditiesSubscription);
    };
  }, [fetchCommodities]);

  const fetchBids = useCallback(async () => {
    const { data, error } = await supabase
      .from("bids")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setBids(data);
    }
  }, []);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  useEffect(() => {
    const bidsSubscription = supabase
      .channel("public:bids")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bids" },
        () => {
          fetchBids();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bidsSubscription);
    };
  }, [fetchBids]);

  // =========================
  // LOGIN / LOGOUT
  // =========================
  const login = (name, role) => {
    setCurrentUser({ name, role });
  };

  const logout = () => {
    setCurrentUser(null);
    // dacă vrei să golești bid-urile la logout, decomentezi linia de mai jos:
    // setBids([]);
  };

  // =========================
  // CREATE BID (fermieri)
  // =========================
  const createBid = ({ commodityId, price, quantity, deliveryPeriod }) => {
    if (!currentUser) return;

    const commodity = commodities.find((c) => c.id === commodityId);
    if (!commodity) return;

    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString();

    const numericPrice = Number(price);
    const numericQty = Number(quantity);

    const newBid = {
      id,
      farmerName: currentUser.name,
      product: commodity.name,

      // preț inițial fermier
      price: numericPrice,
      // prețul ACTIV din negociere (pleacă de la inițial)
      currentPrice: numericPrice,

      quantity: numericQty,
      deliveryPeriod,
      status: "Pending", // Pending | Counter Offer | Completed | Rejected

      finalPrice: null, // la Completed
    };

    setBids((prev) => [...prev, newBid]);
  };

  // =========================
  // UPDATE BID STATUS (admin + fermier)
  // =========================
  // status: "Pending" | "Counter Offer" | "Completed" | "Rejected"
  // newPrice: doar când facem Counter sau Accept la un anumit preț
  const updateBidStatus = (bidId, status, newPrice = null) => {
    setBids((prevBids) =>
      prevBids.map((bid) => {
        if (bid.id !== bidId) return bid;

        const updated = { ...bid, status };

        // Ultimul preț negociat curent
        const currentNegotiatedPrice =
          newPrice !== null && newPrice !== undefined
            ? Number(newPrice)
            : bid.currentPrice ?? bid.price;

        // Dacă avem Counter Offer (admin sau fermier)
        if (status === "Counter Offer") {
          return {
            ...updated,
            currentPrice: currentNegotiatedPrice, // acesta devine prețul activ
          };
        }

        // Dacă se Acceptă oferta => Completed la prețul activ
        if (status === "Completed") {
          return {
            ...updated,
            finalPrice: currentNegotiatedPrice,
            // prețul activ rămâne în currentPrice
            currentPrice: currentNegotiatedPrice,
          };
        }

        // Rejected sau Pending => doar status
        return updated;
      })
    );
  };

  // =========================
  // UPDATE PREȚ PRODUS (admin)
  // =========================
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

        let trend = "flat";
        const diff = nextPrice - oldPrice;

        if (diff > 0) trend = "up";
        else if (diff < 0) trend = "down";

        return {
          ...c,
          price: nextPrice,
          lastPrice: oldPrice,
          priceChange: diff,
          trend,
          lastUpdated: updatedAt,
        };
      })
    );

    return { error: null };
  };

  const fetchFarmerRewards = useCallback(async (farmerId) => {
    if (!farmerId) return null;
    const { data, error } = await supabase
      .from("farmer_rewards")
      .select("farmer_id, points")
      .eq("farmer_id", farmerId)
      .single();

    if (error) return null;

    setFarmerRewards((prev) => ({
      ...prev,
      [farmerId]: Number(data?.points || 0),
    }));
    return data;
  }, []);

  const addFarmerRewardsPoints = useCallback(async (farmerId, deltaPoints) => {
    if (!farmerId) return { error: null };
    const delta = Number(deltaPoints || 0);
    if (!Number.isFinite(delta) || delta <= 0) return { error: null };

    const current = farmerRewards[farmerId] ?? 0;
    const nextPoints = Number(current) + delta;

    const { error } = await supabase
      .from("farmer_rewards")
      .upsert(
        { farmer_id: farmerId, points: nextPoints, updated_at: new Date().toISOString() },
        { onConflict: "farmer_id" }
      );

    if (error) return { error };

    setFarmerRewards((prev) => ({
      ...prev,
      [farmerId]: nextPoints,
    }));
    return { error: null };
  }, [farmerRewards]);

  // =========================
  // VALOAREA CONTEXTULUI
  // =========================
  const value = {
    currentUser,
    setCurrentUser,
    login,
    logout,
    commodities,
    fetchCommodities,
    bids,
    fetchBids,
    farmerRewards,
    fetchFarmerRewards,
    addFarmerRewardsPoints,
    createBid,
    updateBidStatus,
    updateCommodityPrice,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used inside <AppProvider />");
  }
  return ctx;
}
