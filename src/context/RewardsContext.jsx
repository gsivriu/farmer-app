import { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

const RewardsContext = createContext(null);

export function RewardsProvider({ children }) {
  const [farmerRewards, setFarmerRewards] = useState({});

  const fetchFarmerRewards = useCallback(async (farmerId) => {
    if (!farmerId) return null;
    const { data, error } = await supabase
      .from("farmer_rewards")
      .select("farmer_id, points")
      .eq("farmer_id", farmerId)
      .single();

    if (error) return null;

    setFarmerRewards((prev) => ({
      ...prev,
      [farmerId]: Number(data?.points || 0),
    }));
    return data;
  }, []);

  const addFarmerRewardsPoints = useCallback(async (farmerId, deltaPoints) => {
    if (!farmerId) return { error: null };
    const delta = Number(deltaPoints || 0);
    if (!Number.isFinite(delta) || delta <= 0) return { error: null };

    const current = farmerRewards[farmerId] ?? 0;
    const nextPoints = Number(current) + delta;

    const { error } = await supabase
      .from("farmer_rewards")
      .upsert(
        { farmer_id: farmerId, points: nextPoints, updated_at: new Date().toISOString() },
        { onConflict: "farmer_id" }
      );

    if (error) return { error };

    setFarmerRewards((prev) => ({ ...prev, [farmerId]: nextPoints }));
    return { error: null };
  }, [farmerRewards]);

  return (
    <RewardsContext.Provider value={{ farmerRewards, fetchFarmerRewards, addFarmerRewardsPoints }}>
      {children}
    </RewardsContext.Provider>
  );
}

export function useRewardsContext() {
  const ctx = useContext(RewardsContext);
  if (!ctx) throw new Error("useRewardsContext must be used inside <RewardsProvider />");
  return ctx;
}
