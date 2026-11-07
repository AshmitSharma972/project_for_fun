export function BrandMark({ small = false }: { small?: boolean }) {
  return <span className="brand" aria-label="IncidentMind AI">
    <svg className="brand__mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <g fill="currentColor">
        <rect x="18" y="1" width="4" height="9" rx="1"/><rect x="18" y="30" width="4" height="9" rx="1"/>
        <rect x="1" y="18" width="9" height="4" rx="1"/><rect x="30" y="18" width="9" height="4" rx="1"/>
        <rect x="5.8" y="6.8" width="4" height="9" rx="1" transform="rotate(-45 5.8 6.8)"/>
        <rect x="26.3" y="27.3" width="4" height="9" rx="1" transform="rotate(-45 26.3 27.3)"/>
        <rect x="27.3" y="5.8" width="4" height="9" rx="1" transform="rotate(45 27.3 5.8)"/>
        <rect x="6.8" y="26.3" width="4" height="9" rx="1" transform="rotate(45 6.8 26.3)"/>
        <circle cx="20" cy="20" r="4"/>
      </g>
    </svg>
    {!small && <span className="brand__name">INCIDENT<span>MIND</span></span>}
  </span>;
}
