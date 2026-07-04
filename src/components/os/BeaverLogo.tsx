"use client";

interface BeaverLogoProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export function BeaverLogo({
  size = 120,
  className,
  animate = false,
}: BeaverLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={animate ? { animation: "bober-bob 1.6s ease-in-out infinite" } : undefined}
    >
      <defs>
        <linearGradient id="bvr-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b07a45" />
          <stop offset="1" stopColor="#8a5a2b" />
        </linearGradient>
        <linearGradient id="bvr-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8c79a" />
          <stop offset="1" stopColor="#d9a96f" />
        </linearGradient>
      </defs>
      {/* ears */}
      <circle cx="28" cy="34" r="11" fill="#8a5a2b" />
      <circle cx="92" cy="34" r="11" fill="#8a5a2b" />
      <circle cx="28" cy="34" r="5.5" fill="#5e3c1c" />
      <circle cx="92" cy="34" r="5.5" fill="#5e3c1c" />
      {/* head */}
      <ellipse cx="60" cy="62" rx="46" ry="42" fill="url(#bvr-body)" />
      {/* face lighter area */}
      <ellipse cx="60" cy="70" rx="34" ry="30" fill="url(#bvr-face)" />
      {/* eyes */}
      <ellipse cx="44" cy="56" rx="6" ry="7" fill="#2a1a0a" />
      <ellipse cx="76" cy="56" rx="6" ry="7" fill="#2a1a0a" />
      <circle cx="46" cy="54" r="2" fill="#fff" />
      <circle cx="78" cy="54" r="2" fill="#fff" />
      {/* nose */}
      <ellipse cx="60" cy="74" rx="7" ry="5.5" fill="#2a1a0a" />
      {/* teeth */}
      <rect x="54" y="80" width="12" height="11" rx="2.5" fill="#fdfdf6" />
      <line x1="60" y1="80" x2="60" y2="91" stroke="#d9c9a8" strokeWidth="1.2" />
      {/* mouth */}
      <path
        d="M48 82 Q60 92 72 82"
        fill="none"
        stroke="#5e3c1c"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
