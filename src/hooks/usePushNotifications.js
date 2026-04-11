import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "../supabaseClient";

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
  useEffect(() => {
    // Only run on native iOS — no-op in browser / Expo Go
    if (!Capacitor.isNativePlatform()) return;

    let registered = false;

    async function setup() {
      // 1. Request permission
      const { receive } = await PushNotifications.requestPermissions();
      if (receive !== "granted") return;

      // 2. Register with APNs
      await PushNotifications.register();

      // 3. Token received → upsert in DB
      PushNotifications.addListener("registration", async ({ value: token }) => {
        registered = true;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from("device_tokens")
          .upsert(
            { user_id: user.id, token, platform: "ios", updated_at: new Date().toISOString() },
            { onConflict: "user_id,token" },
          );
      });

      // 4. Notification tapped while app is in foreground or background
      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const data = action.notification?.data ?? {};
        if (!data.screen) return;

        if (navigate) {
          // Navigation is ready — go directly
          handleNavigation(navigate, data);
        } else {
          // Cold launch: navigator not mounted yet → stash for later
          try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
          } catch (_) {
            // sessionStorage unavailable (e.g. private mode) — silent fail
          }
        }
      });

      // 5. Registration error
      PushNotifications.addListener("registrationError", (err) => {
        console.error("Push registration error:", err);
      });
    }

    setup();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [navigate]);
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
