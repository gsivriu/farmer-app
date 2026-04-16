import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

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

    const loadProfile = async (currentUser) => {
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
      } catch {
        if (cancelled) return;
        await supabase.auth.signOut({ scope: "local" });
        window.location.replace("/login");
        return;
      }

      if (cancelled) return;

      // Can't determine role — sign out rather than fall back to "farmer"
      if (profileResult.error || !profileResult.data) {
        await supabase.auth.signOut({ scope: "local" });
        window.location.replace("/login");
        return;
      }

      if (profileResult.data.status === "disabled") {
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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

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
