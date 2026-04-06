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

const fmt0 = (n) => Number(n || 0).toLocaleString("en-GB");

function LockIcon({ unlocked }) {
  if (unlocked) {
    return (
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
    );
  }
  return (
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
  );
}

export default function FarmerProgress({ embedded = false }) {
  const [totalAccepted, setTotalAccepted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

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

    if (totalAccepted >= maxTarget) {
      return { complete: true, nextT: maxTarget, remaining: 0, pct: 100 };
    }

    const nextT = targetsOnly.find((t) => totalAccepted < t) ?? maxTarget;
    const pctRaw = (Number(totalAccepted) / Number(nextT)) * 100;
    const pct = Math.max(0, Math.min(100, Math.round(pctRaw)));
    const remaining = Math.max(nextT - totalAccepted, 0);

    return { complete: false, nextT, remaining, pct };
  }, [totalAccepted]);

  return (
    <div className={embedded ? "progress-card" : "card progress-card"} onClick={() => setShowPopup(true)} style={{ cursor: "pointer" }}>
      {/* Header */}
      <div className="progress-head">
        <div className="progress-meta">
          Total delivered: <b>{fmt0(totalAccepted)}</b> /{" "}
          <b>{fmt0(progress.nextT)}</b> t
        </div>
        <button
          className="progress-info-btn"
          onClick={() => setShowPopup(true)}
          aria-label="View gamification tiers"
          title="View rewards"
        >
          {/* Bar chart with upward arrow — growth/progress icon */}
          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            {/* Bars */}
            <rect x="2" y="15" width="3" height="6" rx="0.5" />
            <rect x="7" y="11" width="3" height="10" rx="0.5" />
            <rect x="12" y="7" width="3" height="14" rx="0.5" />
            <rect x="17" y="3" width="3" height="18" rx="0.5" />
            {/* Diagonal arrow line */}
            <line x1="3" y1="16" x2="19" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            {/* Arrowhead */}
            <polyline points="14,2 20,2 20,8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="uv-loader" style={{ "--pct": `${progress.pct}%` }}>
        <div className="uv-bar" />
      </div>

      {/* Reward grid — hidden on mobile, visible on desktop */}
      <div className="reward-grid progress-reward-grid" style={{ marginTop: 20 }}>
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
                  <LockIcon unlocked={unlocked} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Popup overlay */}
      {showPopup && (
        <div className="progress-popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="progress-popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="progress-popup-head">
              <span className="progress-popup-title">Reward Tiers</span>
              <button
                className="progress-popup-close"
                onClick={() => setShowPopup(false)}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="progress-popup-list">
              {TARGETS.map((r) => {
                const unlocked = totalAccepted >= r.t;
                return (
                  <div
                    key={r.t}
                    className={"reward-card popup-reward-card " + (unlocked ? "reward-unlocked" : "reward-locked")}
                  >
                    <div className="reward-top">
                      <div>
                        <div className="reward-title">{r.title}</div>
                        <div className="small-text">{r.desc}</div>
                      </div>
                      <span
                        className={"reward-lock " + (unlocked ? "is-unlocked" : "is-locked")}
                        aria-label={unlocked ? "Unlocked" : "Locked"}
                      >
                        <LockIcon unlocked={unlocked} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
