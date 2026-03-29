import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aalLevel, setAalLevel] = useState(null);
  const [mfaEnrolled, setMfaEnrolled] = useState(false);

  useEffect(() => {
    const loadProfile = async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setRole(null);
        setProfile(null);
        setAalLevel(null);
        setMfaEnrolled(false);
        setLoading(false);
        return;
      }

      const [{ data: profileData }, { data: aalData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("role, status, full_name, sharp_id, telefon, judet")
          .eq("id", currentUser.id)
          .single(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);

      if (profileData?.status === "disabled") {
        await supabase.auth.signOut();
        return;
      }

      setUser(currentUser);
      setProfile(profileData);
      setRole(profileData?.role || "farmer");
      setAalLevel(aalData?.currentLevel || "aal1");
      setMfaEnrolled(aalData?.nextLevel === "aal2");
      setLoading(false);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, aalLevel, mfaEnrolled }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
