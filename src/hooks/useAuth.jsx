import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useIdleLogout, markIdleActivity } from "./useIdleLogout";

// TEMPORARY — remove once the TestFlight login-loop root cause is confirmed.
// Writes to a throwaway debug table instead of console.error since the
// device can't be plugged into Safari Web Inspector right now.
function logAuthDebug(tag, detail) {
  console.error("[auth-debug]", tag, detail);
  supabase.from("auth_debug_logs").insert({ tag, detail: detail ?? null }).then(
    () => {},
    () => {},
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aalLevel, setAalLevel] = useState(null);
  const [mfaEnrolled, setMfaEnrolled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Safety net: if onAuthStateChange never fires (e.g. hung token refresh),
    // force-clear the session and redirect to login after 5 seconds.
    const safetyTimeout = setTimeout(() => {
      if (cancelled) return;
      logAuthDebug("safety-timeout-signout", { note: "onAuthStateChange never fired within 5s" });
      supabase.auth.signOut({ scope: "local" }).finally(() => {
        window.location.replace("/login");
      });
    }, 5000);

    const loadProfile = async (currentUser) => {
      clearTimeout(safetyTimeout);
      if (!currentUser) {
        if (cancelled) return;
        setUser(null);
        setRole(null);
        setProfile(null);
        setAalLevel(null);
        setMfaEnrolled(false);
        setLoading(false);
        return;
      }

      let profileResult, aalResult;
      try {
        [profileResult, aalResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("role, status, full_name, sharp_id, telefon, judet")
            .eq("id", currentUser.id)
            .single(),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        ]);
      } catch (fetchErr) {
        if (cancelled) return;
        logAuthDebug("catch-block-signout", { message: String(fetchErr?.message ?? fetchErr) });
        await supabase.auth.signOut({ scope: "local" });
        window.location.replace("/login");
        return;
      }

      if (cancelled) return;

      // Can't determine role — sign out rather than fall back to "farmer"
      if (profileResult.error || !profileResult.data) {
        logAuthDebug("profile-error-signout", {
          error: profileResult.error ? String(profileResult.error.message ?? profileResult.error) : null,
          hasData: !!profileResult.data,
        });
        await supabase.auth.signOut({ scope: "local" });
        window.location.replace("/login");
        return;
      }

      if (profileResult.data.status === "disabled") {
        logAuthDebug("disabled-account-signout", { status: profileResult.data.status });
        await supabase.auth.signOut({ scope: "local" });
        setLoading(false);
        return;
      }

      // If AAL check fails, default to aal1 — forces MFAVerify for admins (secure)
      const currentAal = aalResult.data?.currentLevel ?? "aal1";
      const mfaIsEnrolled = aalResult.data?.nextLevel === "aal2";

      setUser(currentUser);
      setProfile(profileResult.data);
      setRole(profileResult.data.role);
      setAalLevel(currentAal);
      setMfaEnrolled(mfaIsEnrolled);
      setLoading(false);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      logAuthDebug("auth-state-change", { event, hasSession: !!session, userId: session?.user?.id ?? null });
      if (event === "SIGNED_IN") markIdleActivity();
      loadProfile(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  useIdleLogout(!!user);

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, aalLevel, mfaEnrolled }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
