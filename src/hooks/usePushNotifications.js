import { useEffect, useRef } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { supabase } from "../supabaseClient";

// Access the native PushNotifications plugin via Capacitor's plugin registry.
// This avoids importing @capacitor/push-notifications (which can't be resolved
// in the Vercel web build) while still calling the native iOS plugin correctly.
const getPushNotifications = () => registerPlugin("PushNotifications");

const SESSION_KEY = "pending_push_nav";

/**
 * Registers the device for APNs push notifications and upserts the token
 * in the device_tokens table. Must be called after the user is signed in.
 *
 * Cold launch deep-link fix (P3): when the app opens from a tapped
 * notification before React navigation is ready, we stash the payload in
 * sessionStorage and let the navigation layer consume it on mount.
 */
export function usePushNotifications(navigate) {
  // Keep navigate in a ref so the listener always has the latest value
  // without navigate being a dependency that re-runs the registration effect.
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  useEffect(() => {
    // Only run on native iOS — no-op in browser
    if (!Capacitor.isNativePlatform()) return;

    // Hold a reference so the cleanup function can call removeAllListeners
    let PushNotificationsRef = null;

    async function setup() {
      const PushNotifications = getPushNotifications();
      PushNotificationsRef = PushNotifications;

      // 1. Request permission
      const { receive } = await PushNotifications.requestPermissions();
      if (receive !== "granted") return;

      // 2. Add listeners BEFORE register() — the registration event fires
      //    asynchronously but could arrive before listeners if added after.
      PushNotifications.addListener("registration", async ({ value: token }) => {
        console.log("[Push] APNs token received, length:", token?.length);
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr) { console.error("[Push] getUser error:", authErr); return; }
        if (!user) { console.error("[Push] No user session at registration time"); return; }

        const { error: upsertErr } = await supabase
          .from("device_tokens")
          .upsert(
            { user_id: user.id, token, platform: "ios", updated_at: new Date().toISOString() },
            { onConflict: "user_id,token" },
          );
        if (upsertErr) {
          console.error("[Push] device_tokens upsert failed:", upsertErr);
        } else {
          console.log("[Push] Token saved OK for user:", user.id.slice(0, 8));
        }
      });

      PushNotifications.addListener("registrationError", (err) => {
        console.error("Push registration error:", err);
      });

      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const data = action.notification?.data ?? {};
        if (!data.screen) return;

        if (navigateRef.current) {
          handleNavigation(navigateRef.current, data);
        } else {
          try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
          } catch (_) {
            // sessionStorage unavailable — silent fail
          }
        }
      });

      // 3. Register with APNs — token arrives via "registration" listener above
      await PushNotifications.register();
    }

    setup();

    return () => {
      PushNotificationsRef?.removeAllListeners();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally runs once
}

/**
 * Call this in your root component's useEffect (after navigate is available)
 * to consume any notification that arrived during cold launch.
 */
export function useConsumePendingPushNav(navigate) {
  useEffect(() => {
    if (!navigate) return;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      sessionStorage.removeItem(SESSION_KEY);
      const data = JSON.parse(raw);
      handleNavigation(navigate, data);
    } catch (_) {
      // Corrupt data — ignore
    }
  }, [navigate]);
}

// ---------------------------------------------------------------------------
// Routing helper — extend as notification types grow.
// FarmerDashboard reads active tab from localStorage on mount, so writing
// there before navigating to /dashboard is the simplest deep-link mechanism.
// ---------------------------------------------------------------------------
function handleNavigation(navigate, data) {
  if (data.screen === "bid") {
    window.localStorage.setItem("farmer-active-tab", "activity");
    navigate("/dashboard");
  } else if (data.screen === "commodities") {
    window.localStorage.setItem("farmer-active-tab", "home");
    navigate("/dashboard");
  }
}
