// src/components/FarmerProgress.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const TARGETS = [
  { t: 1000, title: "1,000 t", desc: "+2 EUR/t on the next 500 t sold" },
  {
    t: 2500,
    title: "2,500 t",
    desc: "+3 EUR/t on the next 1,000 t sold",
  },
  { t: 5000, title: "5,000 t", desc: "+5 EUR/t on the next 2,000 t sold" },
];

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmt0 = (n) => Number(n || 0).toLocaleString("en-GB");

export default function FarmerProgress({ embedded = false }) {
  const [totalAccepted, setTotalAccepted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const loadAcceptedVolume = async () => {
    setLoading(true);
    setErr(null);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      setLoading(false);
      setErr("We couldn't identify the current user.");
      return;
    }

    const user = userData.user;

    const { data: bids, error: bidsErr } = await supabase
      .from("bids")
      .select("quantity")
      .eq("farmer_id", user.id)
      .eq("status", "accepted");

    if (bidsErr) {
      setLoading(false);
      setErr("Error loading volume: " + bidsErr.message);
      return;
    }

    const sum = (bids || []).reduce((acc, r) => acc + Number(r.quantity || 0), 0);
    setTotalAccepted(sum);
    setLoading(false);
  };

  useEffect(() => {
    loadAcceptedVolume();

    const onVis = () => {
      if (document.visibilityState === "visible") loadAcceptedVolume();
    };
    const onRefresh = () => {
      loadAcceptedVolume();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("farmer-progress-refresh", onRefresh);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("farmer-progress-refresh", onRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = useMemo(() => {
    const targetsOnly = TARGETS.map((x) => x.t);
    const maxTarget = targetsOnly[targetsOnly.length - 1];

    // If total exceeds the last target, mark as complete.
    if (totalAccepted >= maxTarget) {
      return {
        complete: true,
        nextT: maxTarget,
        remaining: 0,
        pct: 100,
      };
    }

    // Next target is the smallest target greater than totalAccepted.
    const nextT = targetsOnly.find((t) => totalAccepted < t) ?? maxTarget;

    const pctRaw = (Number(totalAccepted) / Number(nextT)) * 100;
    const pct = Math.max(0, Math.min(100, Math.round(pctRaw)));

    const remaining = Math.max(nextT - totalAccepted, 0);

    return {
      complete: false,
      nextT,
      remaining,
      pct,
    };
  }, [totalAccepted]);

  return (
  <div className={(embedded ? "progress-card" : "card progress-card")}>
    {/* Header */}
    <div className="progress-head">
      <div className="progress-title-group">
        <div className="progress-meta">
          Total delivered: <b>{fmt0(totalAccepted)}</b> /{" "}
          <b>{fmt0(progress.nextT)}</b> t
        </div>
      </div>
      <div className="progress-head-spacer" aria-hidden="true" />
    </div>

    {/* Progress bar */}
    <div className="uv-loader" style={{ "--pct": `${progress.pct}%` }}>
      <div className="uv-bar" />

    </div>

    {/* Rewards */}
    <div className="reward-grid" style={{ marginTop: 20 }}>
      {TARGETS.map((r) => {
        const unlocked = totalAccepted >= r.t;
        return (
          <div
            key={r.t}
            className={"reward-card " + (unlocked ? "reward-unlocked" : "reward-locked")}
          >
            <div className="reward-top">
              <div>
                <div className="reward-title">{r.title}</div>
                <div className="small-text">{r.desc}</div>
              </div>

              <span
                className={"reward-lock " + (unlocked ? "is-unlocked" : "is-locked")}
                aria-label={unlocked ? "Unlocked" : "Locked"}
                title={unlocked ? "Unlocked" : "Locked"}
              >
                {unlocked ? (
                  <svg viewBox="0 0 24 24" className="lock-icon" aria-hidden="true">
                    <path
                      d="M7 11V8a5 5 0 0 1 9.5-2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <rect
                      x="5"
                      y="11"
                      width="14"
                      height="10"
                      rx="2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="lock-icon" aria-hidden="true">
                    <rect
                      x="5"
                      y="11"
                      width="14"
                      height="10"
                      rx="2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M8 11V8a4 4 0 0 1 8 0v3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

}
