import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "../supabaseClient";

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

  // Delta realtime: update state locally instead of full refetch on every change
  useEffect(() => {
    let channel = null;
    let retryTimeout = null;
    let retries = 0;
    let destroyed = false;

    const subscribe = () => {
      if (destroyed) return;
      if (channel) supabase.removeChannel(channel);

      channel = supabase
        .channel(`bids-delta-${Date.now()}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids" },
          (payload) => { setBids((prev) => [payload.new, ...prev]); }
        )
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bids" },
          (payload) => { setBids((prev) => prev.map((b) => b.id === payload.new.id ? payload.new : b)); }
        )
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "bids" },
          (payload) => { setBids((prev) => prev.filter((b) => b.id !== payload.old.id)); }
        )
        .subscribe((status) => {
          if (destroyed) return;
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (channel) { supabase.removeChannel(channel); channel = null; }
            const delay = Math.min(3000 * Math.pow(2, retries), 30000);
            retries++;
            retryTimeout = setTimeout(subscribe, delay);
          } else if (status === "SUBSCRIBED") {
            retries = 0;
          }
        });
    };

    subscribe();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(retryTimeout);
        retries = 0;
        subscribe();
        fetchBids();
      }
    };

    const handleResume = () => {
      clearTimeout(retryTimeout);
      retries = 0;
      subscribe();
      fetchBids();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("resume", handleResume);

    return () => {
      destroyed = true;
      clearTimeout(retryTimeout);
      if (channel) supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("resume", handleResume);
    };
  }, [fetchBids]);

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
