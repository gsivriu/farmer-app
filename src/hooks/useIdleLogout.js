import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { supabase } from "../supabaseClient";
import { BUILD_ID } from "../buildInfo";

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
 *
 * `lastSignInAt` is the current session's `user.last_sign_in_at`. It is the
 * structural guard against the login loop: a session that authenticated less
 * than IDLE_TIMEOUT_MS ago cannot possibly have been idle for that long, so
 * it is never signed out no matter what localStorage says. markIdleActivity()
 * on SIGNED_IN and clearing the stamp at sign-out both fix the loop by
 * keeping the stored timestamp correct; this one holds even when it isn't.
 */
export function useIdleLogout(enabled, lastSignInAt) {
  const lastWriteRef = useRef(0);
  const signedInAtRef = useRef(null);

  const parsedSignInAt = lastSignInAt ? Date.parse(lastSignInAt) : NaN;
  signedInAtRef.current = Number.isFinite(parsedSignInAt) ? parsedSignInAt : null;

  useEffect(() => {
    if (!enabled) return;

    // TEMPORARY — remove once the TestFlight login-loop root cause is
    // confirmed. Logs every mount unconditionally so we can tell "the idle
    // check ran and decided not to sign out" apart from "it never ran".
    supabase.from("auth_debug_logs").insert({
      tag: "idle-logout-mounted",
      detail: {
        buildId: BUILD_ID,
        storedRaw: window.localStorage.getItem(STORAGE_KEY),
        lastSignInAt: lastSignInAt ?? null,
      },
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
      // A session younger than the idle timeout can't have been idle for the
      // idle timeout. Makes "fresh login bounced straight back to /login"
      // impossible regardless of what's left in localStorage.
      const signedInAt = signedInAtRef.current;
      if (signedInAt !== null && Date.now() - signedInAt < IDLE_TIMEOUT_MS) {
        return false;
      }

      const last = readLastActive();
      const elapsed = Date.now() - last;
      if (elapsed >= IDLE_TIMEOUT_MS) {
        // Drop the stamp before signing out. Leaving a stale one behind is what
        // bounced the *next* login straight back to /login: the effect below
        // re-mounts on that login and re-reads this same expired value.
        window.localStorage.removeItem(STORAGE_KEY);
        const detail = {
          buildId: BUILD_ID,
          elapsedMs: elapsed,
          lastActiveAt: new Date(last).toISOString(),
          lastSignInAt: lastSignInAt ?? null,
        };
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
    // lastSignInAt is read through signedInAtRef so a token refresh that
    // re-creates the user object doesn't tear down and re-run the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
