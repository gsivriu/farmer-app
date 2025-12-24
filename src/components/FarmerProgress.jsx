// src/components/FarmerProgress.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import ProgressRing from "./ProgressRing";

const TARGETS = [
  { t: 1000, title: "1,000 t", desc: "+2 EUR/t on the next 500 t sold" },
  {
    t: 2500,
    title: "2,500 t",
    desc: "+3 EUR/t on the next 1,000 t sold",
  },
  { t: 5000, title: "5,000 t", desc: "+5 EUR/t on the next 2,000 t sold" },
];

const MAX_TARGET = TARGETS[TARGETS.length - 1].t;

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmt0 = (n) => Number(n || 0).toLocaleString("en-GB");

export default function FarmerProgress() {
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
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

 const progress = useMemo(() => {
  const targetsOnly = TARGETS.map((x) => x.t);
  const maxTarget = targetsOnly[targetsOnly.length - 1];

  // dacă ești peste ultimul target -> complete
  if (totalAccepted >= maxTarget) {
    return {
      complete: true,
      nextT: maxTarget,
      remaining: 0,
      pct: 100,
    };
  }

  // următorul target (cel mai mic target mai mare decât totalAccepted)
  const nextT = targetsOnly.find((t) => totalAccepted < t) ?? maxTarget;

  const pctRaw = (Number(totalAccepted) / Number(maxTarget)) * 100;
  const pct = Math.max(0, Math.min(100, Math.round(pctRaw)));

  const remaining = Math.max(nextT - totalAccepted, 0);

  return {
    complete: false,
    nextT,
    remaining,
    pct,
  };
  }, [totalAccepted]);


  // Text alb dacă centrul etichetei e în zona roșie (fill)
  const labelInFill = useMemo(() => {
    const center = 50; // text e centrat
    return progress.pct >= center;
  }, [progress.pct]);

  return (
  <div className="card progress-card">
    {/* Header */}
    <div className="progress-head">
      <div className="progress-title-group">
        <h2 className="progress-title">Your Delivery Progress</h2>
        <div className="small-text">
          Total accepted volume: <b>{fmt(totalAccepted)} t</b>
        </div>
        <div className="progress-meta small-text">
          {progress.complete ? (
            <b>Congrats — you have reached all targets.</b>
          ) : (
            <>
              Progress: <b>{fmt0(totalAccepted)} t</b> /{" "}
              <b>{fmt0(MAX_TARGET)} t</b>
              <br />
              Remaining to unlock: <b>{fmt0(progress.remaining)} t</b>
            </>
          )}
        </div>
      </div>
      <div className="progress-ring-center">
        <ProgressRing percent={progress.pct} />
      </div>
      <div className="progress-head-spacer" aria-hidden="true" />
    </div>

    {/* Progress bar */}
    <div className="uv-loader" style={{ "--pct": `${progress.pct}%` }}>
      <div className="uv-bar" />

      <div className="uv-checks">
        {TARGETS.map((r) => {
          const active = totalAccepted >= r.t;
          return (
            <div
              key={r.t}
              className={"uv-check " + (active ? "is-active" : "")}
              title={r.title}
              aria-hidden="true"
            >
              <svg
                className="uv-check-icon"
                stroke="white"
                strokeWidth="2"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="m4.5 12.75 6 6 9-13.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          );
        })}
      </div>
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

              <span className={"badge " + (unlocked ? "accepted" : "pending")}>
                {unlocked ? "Unlocked" : "Locked"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

}
