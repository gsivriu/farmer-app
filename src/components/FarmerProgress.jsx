// src/components/FarmerProgress.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const TARGETS = [
  { t: 1000, title: "1,000 t", desc: "+2 EUR/t la următoarele 500 t vândute" },
  {
    t: 2500,
    title: "2,500 t",
    desc: "Blochezi un preț 15 zile (max 1,000 t) pe un produs",
  },
  { t: 5000, title: "5,000 t", desc: "+5 EUR/t la următoarele 2,000 t vândute" },
];

const fmt = (n) =>
  Number(n || 0).toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmt0 = (n) => Number(n || 0).toLocaleString("ro-RO");

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
      setErr("Nu am putut identifica utilizatorul.");
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
      setErr("Eroare la încărcarea volumului: " + bidsErr.message);
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

    // dacă ești peste ultimul target -> ești "complete"
    const maxTarget = targetsOnly[targetsOnly.length - 1];
    if (totalAccepted >= maxTarget) {
      const prevT = targetsOnly[targetsOnly.length - 2] ?? 0;
      const span = maxTarget - prevT;

      return {
        complete: true,
        prevT,
        nextT: maxTarget,
        span,
        segmentProgress: span,
        remaining: 0,
        pct: 100,
        pctLabel: `100% (${fmt0(span)} / ${fmt0(span)} t)`,
      };
    }

    // găsește următorul target
    const nextT = targetsOnly.find((t) => totalAccepted < t);
    const idx = targetsOnly.findIndex((t) => t === nextT);
    const prevT = idx <= 0 ? 0 : targetsOnly[idx - 1];

    const span = Math.max(nextT - prevT, 1);
    const segmentProgress = Math.min(Math.max(totalAccepted - prevT, 0), span);
    const remaining = Math.max(nextT - totalAccepted, 0);

    const pct = Math.round((segmentProgress / span) * 100);

    return {
      complete: false,
      prevT,
      nextT,
      span,
      segmentProgress,
      remaining,
      pct,
      pctLabel: `${pct}% (${fmt0(segmentProgress)} / ${fmt0(span)} t)`,
    };
  }, [totalAccepted]);

  // Text alb dacă centrul etichetei e în zona roșie (fill)
  const labelInFill = useMemo(() => {
    const center = 50; // text e centrat
    return progress.pct >= center;
  }, [progress.pct]);

  return (
    <div className="card">
      <div className="progress-head">
        <div>
          <h2 style={{ marginBottom: 6 }}>Progress target volum</h2>
          <div className="small-text">
            Volum total acceptat: <b>{fmt(totalAccepted)} t</b>
          </div>
        </div>

        <div style={{ textAlign: "right" }} className="small-text">
          {progress.complete ? (
            <b>Felicitări — ai atins toate targeturile.</b>
          ) : (
            <>
              Segment curent: <b>{fmt0(progress.prevT)} t</b> →{" "}
              <b>{fmt0(progress.nextT)} t</b>
              <br />
              Următorul target: <b>{fmt0(progress.nextT)} t</b> ({fmt(progress.remaining)} t rămas)
            </>
          )}
        </div>
      </div>

      {err && (
        <p className="badge rejected" style={{ marginTop: 10 }}>
          {err}
        </p>
      )}
      {loading && (
        <p className="small-text" style={{ marginTop: 10 }}>
          Se încarcă...
        </p>
      )}

      {/* Bara (mai groasă) */}
      <div className="progress-bar" style={{ marginTop: 12, height: 28 }}>
        <div className="progress-fill" style={{ width: `${progress.pct}%` }} />
        <div
          className="progress-text"
          style={{
            color: labelInFill ? "#fff" : "#111827",
            fontWeight: 800,
          }}
        >
          {progress.pctLabel}
        </div>
      </div>

      {/* Cele 3 dreptunghiuri (verde când unlocked) */}
      <div className="reward-grid" style={{ marginTop: 14 }}>
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
