import { useEffect } from "react";
import { App } from "@capacitor/app";
import { supabase } from "../supabaseClient";

/**
 * Subscribes to Supabase Realtime changes on a given table.
 * Automatically retries on CHANNEL_ERROR / TIMED_OUT and
 * reconnects when the page becomes visible again or the app resumes.
 *
 * @param {string} table - Supabase table name to watch
 * @param {Function} onChanged - stable callback (wrap in useCallback) called on any change
 */
export function useRealtimeSubscription(table, onChanged) {
  useEffect(() => {
    let channel = null;
    let retryTimeout = null;
    let retries = 0;
    let destroyed = false;

    const removeChannel = () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    const subscribe = () => {
      if (destroyed) return;
      removeChannel();
      channel = supabase
        .channel(`public:${table}:${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => { onChanged(); }
        )
        .subscribe((status) => {
          if (destroyed) return;
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            removeChannel();
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
        subscribe();
        onChanged();
      }
    };

    const handleResume = () => {
      clearTimeout(retryTimeout);
      retries = 0;
      subscribe();
      onChanged();
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
        onChanged();
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
      removeChannel();
      document.removeEventListener("visibilitychange", handleVisibility);
      appStateSub?.remove();
    };
  }, [table, onChanged]);
}
