import { useState } from "react";
import { supabase } from "../supabaseClient";

export function useMFA() {
  const [pendingFactorId, setPendingFactorId] = useState(null);

  const enrollMFA = async () => {
    // Try to enroll directly first
    let result = await supabase.auth.mfa.enroll({ factorType: "totp" });

    // If a factor already exists (e.g. after refresh mid-setup), clean up and retry
    if (result.error) {
      const { data: existing } = await supabase.auth.mfa.listFactors();
      const unverified = existing?.totp?.filter((f) => f.status !== "verified") ?? [];
      await Promise.all(unverified.map((f) => supabase.auth.mfa.unenroll({ factorId: f.id })));
      result = await supabase.auth.mfa.enroll({ factorType: "totp" });
    }

    if (result.error) throw result.error;
    setPendingFactorId(result.data.id);
    return {
      qrCode: result.data.totp.qr_code,
      secret: result.data.totp.secret,
      uri: result.data.totp.uri,
      factorId: result.data.id,
    };
  };

  const verifyEnrollment = async (code) => {
    if (!pendingFactorId) throw new Error("Call enrollMFA() first");
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: pendingFactorId,
    });
    if (challengeError) throw challengeError;

    const { data, error } = await supabase.auth.mfa.verify({
      factorId: pendingFactorId,
      challengeId: challenge.id,
      code,
    });
    if (error) throw error;
    setPendingFactorId(null);
    return data;
  };

  const getMFAStatus = async () => {
    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) throw aalError;

    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) throw factorsError;

    const verifiedFactor = factors?.totp?.find((f) => f.status === "verified");

    return {
      enrolled: aal?.nextLevel === "aal2",
      factorId: verifiedFactor?.id || null,
    };
  };

  const challengeAndVerify = async (code) => {
    const { factorId } = await getMFAStatus();
    if (!factorId) throw new Error("No MFA factor enrolled");

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) throw challengeError;

    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    if (error) throw error;
    return data;
  };

  const unenrollMFA = async () => {
    const { factorId } = await getMFAStatus();
    if (!factorId) throw new Error("No MFA factor enrolled");

    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;
  };

  return { enrollMFA, verifyEnrollment, challengeAndVerify, unenrollMFA, getMFAStatus };
}
