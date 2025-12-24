export default function ProgressRing({ percent }) {
  return (
    <div className="progress-ring">
      <div
        className="ring-outer neon"
        style={{ "--pct": percent }}
      >
        <div className="ring-inner">
          <span className="ring-label">{percent}%</span>
        </div>
      </div>
    </div>
  );
}
