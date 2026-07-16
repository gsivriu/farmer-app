import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { App } from "@capacitor/app";
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

    // Health check: catches WebSocket connections silently killed by iOS while
    // the WKWebView was suspended, where neither visibilitychange nor a
    // CHANNEL_ERROR ever fires.
    const healthCheck = setInterval(() => {
      if (document.visibilityState === "visible" && channel && channel.state !== "joined") {
        clearTimeout(retryTimeout);
        retries = 0;
        subscribe();
        fetchBids();
      }
    }, 20000);

    let appStateSub;
    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) handleResume();
    }).then((sub) => { appStateSub = sub; });

    return () => {
      destroyed = true;
      clearTimeout(retryTimeout);
      clearInterval(healthCheck);
      if (channel) supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
      appStateSub?.remove();
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
