import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useRealtimeSubscription } from "../hooks/useRealtimeSubscription";

const BidsContext = createContext(null);

export function BidsProvider({ children }) {
  const [bids, setBids] = useState([]);

  const fetchBids = useCallback(async () => {
    const { data, error } = await supabase
      .from("bids")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setBids(data);
  }, []);

  useEffect(() => { fetchBids(); }, [fetchBids]);
  useRealtimeSubscription("bids", fetchBids);

  return (
    <BidsContext.Provider value={{ bids, fetchBids }}>
      {children}
    </BidsContext.Provider>
  );
}

export function useBidsContext() {
  const ctx = useContext(BidsContext);
  if (!ctx) throw new Error("useBidsContext must be used inside <BidsProvider />");
  return ctx;
}
