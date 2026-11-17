import React from 'react';

interface AroraBrandIconProps {
  size?: number;
  className?: string;
}

export const AroraBrandIcon: React.FC<AroraBrandIconProps> = ({
  size = 32,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="aroraBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#060A18" />
          <stop offset="100%" stopColor="#130C2B" />
        </linearGradient>
        <linearGradient id="aroraA" x1="14" y1="10" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="55%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#aroraBg)" />
      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="61"
        rx="14.5"
        stroke="url(#aroraA)"
        strokeOpacity="0.4"
        strokeWidth="1.5"
      />
      <path
        d="M32 13L15 50H22.2L32 27.5L41.8 50H49L32 13Z"
        stroke="url(#aroraA)"
        strokeWidth="3.2"
        strokeLinejoin="round"
        fill="#081226"
        fillOpacity="0.65"
      />
      <path
        d="M24 39H40L32 31.5L24 39Z"
        stroke="#67E8F9"
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill="#22D3EE"
        fillOpacity="0.2"
      />
      <circle cx="32" cy="22.5" r="2" fill="#22D3EE" />
    </svg>
  );
};
