/** Decorative marketplace scene — customers, providers, platform. */
export function HeroVisual() {
  return (
    <svg
      viewBox="0 0 720 420"
      className="h-full w-full"
      role="img"
      aria-label="Illustration of a marketplace booking flow with simulated payment status"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d8ebe3" />
          <stop offset="100%" stopColor="#f3f1eb" />
        </linearGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0f3d32" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0e7490" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect width="720" height="420" fill="url(#sky)" />
      <path d="M0 320 H720 V420 H0 Z" fill="url(#ground)" />

      {/* Lagos-inspired skyline silhouette */}
      <g fill="#0f3d32" opacity="0.18">
        <rect x="40" y="180" width="48" height="140" />
        <rect x="100" y="140" width="36" height="180" />
        <rect x="148" y="200" width="60" height="120" />
        <rect x="220" y="160" width="28" height="160" />
        <rect x="560" y="170" width="42" height="150" />
        <rect x="612" y="130" width="50" height="190" />
        <rect x="670" y="210" width="30" height="110" />
      </g>

      {/* Platform hub */}
      <g transform="translate(310 150)">
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          rx="12"
          fill="#0f3d32"
        />
        <text
          x="50"
          y="42"
          textAnchor="middle"
          fill="#f7f4ef"
          fontFamily="system-ui,sans-serif"
          fontSize="11"
          fontWeight="700"
        >
          PLATFORM
        </text>
        <text
          x="50"
          y="62"
          textAnchor="middle"
          fill="#b8d9ce"
          fontFamily="system-ui,sans-serif"
          fontSize="10"
        >
          fees · status
        </text>
        <text
          x="50"
          y="78"
          textAnchor="middle"
          fill="#b8d9ce"
          fontFamily="system-ui,sans-serif"
          fontSize="10"
        >
          simulated
        </text>
      </g>

      {/* Customer node */}
      <g transform="translate(80 240)">
        <circle cx="40" cy="40" r="40" fill="#fff" stroke="#0f3d32" strokeWidth="2" />
        <text
          x="40"
          y="36"
          textAnchor="middle"
          fill="#0f3d32"
          fontFamily="system-ui,sans-serif"
          fontSize="11"
          fontWeight="700"
        >
          CUSTOMER
        </text>
        <text
          x="40"
          y="54"
          textAnchor="middle"
          fill="#5c6b66"
          fontFamily="system-ui,sans-serif"
          fontSize="10"
        >
          browse · book
        </text>
      </g>

      {/* Provider node */}
      <g transform="translate(520 240)">
        <circle cx="40" cy="40" r="40" fill="#fff" stroke="#0e7490" strokeWidth="2" />
        <text
          x="40"
          y="36"
          textAnchor="middle"
          fill="#0e7490"
          fontFamily="system-ui,sans-serif"
          fontSize="11"
          fontWeight="700"
        >
          PROVIDER
        </text>
        <text
          x="40"
          y="54"
          textAnchor="middle"
          fill="#5c6b66"
          fontFamily="system-ui,sans-serif"
          fontSize="10"
        >
          earn · payout
        </text>
      </g>

      {/* Connection lines */}
      <path
        d="M160 270 C230 250, 280 220, 310 200"
        fill="none"
        stroke="#0f3d32"
        strokeWidth="2"
        strokeDasharray="6 6"
        className="hero-dash"
      />
      <path
        d="M410 200 C460 220, 500 250, 560 270"
        fill="none"
        stroke="#0e7490"
        strokeWidth="2"
        strokeDasharray="6 6"
        className="hero-dash hero-dash-delay"
      />
    </svg>
  );
}
