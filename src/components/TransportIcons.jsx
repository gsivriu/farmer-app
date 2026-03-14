export function TrainIcon({ size = 18, color = "#555e68", bgColor = "#f0f4f8", borderColor = "#b0bec5", showCircle = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      {showCircle && (
        <circle cx="9" cy="9" r="8" fill={bgColor} stroke={borderColor} strokeWidth="1.5"/>
      )}
      <g fill={color}>
        <rect x="4" y="5" width="10" height="5" rx="1.5"/>
        <rect x="4" y="10" width="10" height="1.5" rx="0.5"/>
        <rect x="4" y="6.2" width="10" height="0.8"/>
        <rect x="6.5" y="5" width="0.8" height="1.5"/>
        <rect x="10.7" y="5" width="0.8" height="1.5"/>
        <circle cx="6" cy="13" r="1.2"/>
        <circle cx="12" cy="13" r="1.2"/>
        <rect x="7.5" y="12.3" width="3" height="1.4" rx="0.4"/>
      </g>
    </svg>
  );
}

export function BargeIcon({ size = 18, color = "#555e68", bgColor = "#f0f4f8", borderColor = "#b0bec5", showCircle = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      {showCircle && (
        <circle cx="9" cy="9" r="8" fill={bgColor} stroke={borderColor} strokeWidth="1.5"/>
      )}
      <g fill={color}>
        <rect x="5" y="4.5" width="8" height="5" rx="1.2"/>
        <rect x="6.5" y="3" width="5" height="2.5" rx="1"/>
        <rect x="2" y="9.5" width="14" height="2.5" rx="1"/>
        <path d="M2 12 Q5.5 15 9 15 Q12.5 15 16 12 Z"/>
        <path d="M1.5 15.5 Q4 14 6 15.5 Q7.5 17 9 15.5 Q10.5 14 12 15.5 Q14 17 16.5 15.5"
          stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none"/>
        <rect x="7" y="6" width="4" height="3" rx="0.5" fill={bgColor}/>
      </g>
    </svg>
  );
}

export function TruckIcon({ size = 18, color = "#555e68", bgColor = "#f0f4f8", borderColor = "#b0bec5", showCircle = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      {showCircle && (
        <circle cx="9" cy="9" r="8" fill={bgColor} stroke={borderColor} strokeWidth="1.5"/>
      )}
      <g fill={color}>
        <rect x="2" y="5" width="9" height="7" rx="1"/>
        <path d="M11 7 L11 12 L16 12 L16 9.5 L14 7 Z"/>
        <circle cx="5" cy="13.5" r="1.5"/>
        <circle cx="13" cy="13.5" r="1.5"/>
        <rect x="3.5" y="12" width="3" height="1.5"/>
        <rect x="11.5" y="12" width="3" height="1.5"/>
      </g>
    </svg>
  );
}
