import React, { createContext, useContext, useEffect, useState } from "react";

const AppContext = createContext(null);

const COMMODITIES_STORAGE_KEY = "ameropa-commodities-v1";
const BIDS_STORAGE_KEY = "ameropa-bids-v1";

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
  },
  {
    id: "barley",
    name: "Orz",
    price: 180,
    basis: "CPT Constanța",
    lastPrice: null,
    priceChange: 0,
    trend: "flat",
  },
  {
    id: "corn",
    name: "Porumb",
    price: 190,
    basis: "CPT Constanța",
    lastPrice: null,
    priceChange: 0,
    trend: "flat",
  },
  {
    id: "rapeseed",
    name: "Rapiță",
    price: 420,
    basis: "CPT Constanța",
    lastPrice: null,
    priceChange: 0,
    trend: "flat",
  },
  {
    id: "sunflower",
    name: "Floarea soarelui",
    price: 380,
    basis: "CPT Constanța",
    lastPrice: null,
    priceChange: 0,
    trend: "flat",
  },
];

const loadStoredCommodities = () => {
  if (typeof window === "undefined") return initialCommodities;
  try {
    const raw = window.localStorage.getItem(COMMODITIES_STORAGE_KEY);
    if (!raw) return initialCommodities;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return initialCommodities;

    const byId = new Map(
      parsed
        .filter((item) => item && typeof item.id === "string")
        .map((item) => [item.id, item])
    );

    return initialCommodities.map((base) => {
      const stored = byId.get(base.id);
      if (!stored) return base;

      const price = Number(stored.price);
      const lastPrice = stored.lastPrice == null ? null : Number(stored.lastPrice);
      const priceChange =
        stored.priceChange == null ? base.priceChange : Number(stored.priceChange);

      return {
        ...base,
        name: stored.name || base.name,
        basis: stored.basis || base.basis,
        price: Number.isFinite(price) ? price : base.price,
        lastPrice: Number.isFinite(lastPrice) ? lastPrice : base.lastPrice,
        priceChange: Number.isFinite(priceChange) ? priceChange : base.priceChange,
        trend: stored.trend || base.trend,
      };
    });
  } catch {
    return initialCommodities;
  }
};

export function AppProvider({ children }) {
  // utilizatorul curent: { name, role: "farmer" | "admin" }
  const [currentUser, setCurrentUser] = useState(null);

  // prețuri zilnice la produse
  const [commodities, setCommodities] = useState(loadStoredCommodities);

  // lista de bid-uri
  const [bids, setBids] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(BIDS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      COMMODITIES_STORAGE_KEY,
      JSON.stringify(commodities)
    );
  }, [commodities]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(BIDS_STORAGE_KEY, JSON.stringify(bids));
  }, [bids]);

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
  const updateCommodityPrice = (id, newPrice) => {
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
        };
      })
    );
  };

  // =========================
  // VALOAREA CONTEXTULUI
  // =========================
  const value = {
    currentUser,
    setCurrentUser,
    login,
    logout,
    commodities,
    bids,
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
