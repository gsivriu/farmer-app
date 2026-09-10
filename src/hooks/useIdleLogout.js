import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { supabase } from "../supabaseClient";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 oră
const CHECK_INTERVAL_MS = 60 * 1000;
const WRITE_THROTTLE_MS = 10 * 1000;
const STORAGE_KEY = "farmer-app-last-active-at";
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "touchstart", "scroll"];

/**
 * Resets the idle clock on a fresh interactive sign-in. Must be called when
 * a login actually happens (the SIGNED_IN auth event) — otherwise a stale
 * timestamp left over from a previous session (signed out over an hour ago)
 * gets read by the idle check the instant the post-login effect below
 * mounts, forcing an immediate re-signout and locking the user in a login
 * loop, since the check-fails path intentionally skips refreshing it.
 */
export function markIdleActivity() {
  window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
}

/**
 * Signs the user out after IDLE_TIMEOUT_MS with no interaction. Counts
 * backgrounded/locked time too, not just foreground idling — the common
 * real case is someone locking their phone (or leaving the browser tab)
 * with the app open and coming back hours later.
 */
export function useIdleLogout(enabled) {
  const lastWriteRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    // TEMPORARY — remove once the TestFlight login-loop root cause is
    // confirmed. Logs every mount unconditionally so we can tell "the idle
    // check ran and decided not to sign out" apart from "it never ran".
    supabase.from("auth_debug_logs").insert({
      tag: "idle-logout-mounted",
      detail: { storedRaw: window.localStorage.getItem(STORAGE_KEY) },
    }).then(() => {}, () => {});

    const readLastActive = () => {
      const stored = Number(window.localStorage.getItem(STORAGE_KEY));
      return Number.isFinite(stored) && stored > 0 ? stored : Date.now();
    };

    const markActive = () => {
      const now = Date.now();
      lastWriteRef.current = now;
      window.localStorage.setItem(STORAGE_KEY, String(now));
    };

    const throttledMarkActive = () => {
      if (Date.now() - lastWriteRef.current < WRITE_THROTTLE_MS) return;
      markActive();
    };

    const checkIdle = () => {
      const last = readLastActive();
      const elapsed = Date.now() - last;
      if (elapsed >= IDLE_TIMEOUT_MS) {
        const detail = { elapsedMs: elapsed, lastActiveAt: new Date(last).toISOString() };
        console.error("[auth-debug] idle-logout-signout", detail);
        supabase.from("auth_debug_logs").insert({ tag: "idle-logout-signout", detail }).then(
          () => {},
          () => {},
        );
        supabase.auth.signOut({ scope: "local" });
        return true;
      }
      return false;
    };

    // Verifică timpul scurs ÎNAINTE de a marca activitate — altfel o simplă
    // redeschidere a aplicației după ore de inactivitate ar reseta ceasul
    // exact în cazul pe care vrem să-l prindem.
    const handleResume = () => {
      if (!checkIdle()) markActive();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") handleResume();
    };

    handleResume();

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, throttledMarkActive, { passive: true })
    );
    document.addEventListener("visibilitychange", handleVisibility);

    let appStateSub;
    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) handleResume();
    }).then((sub) => {
      appStateSub = sub;
    });

    const interval = setInterval(checkIdle, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, throttledMarkActive));
      document.removeEventListener("visibilitychange", handleVisibility);
      appStateSub?.remove();
      clearInterval(interval);
    };
  }, [enabled]);
}
