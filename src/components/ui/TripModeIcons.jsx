import React from 'react';

/**
 * The two booking-mode icons, drawn in the same outline style as the app's lucide icons (24×24, 2px round
 * strokes, `currentColor`) so they sit beside them naturally. lucide has no steering wheel or chauffeur's cap,
 * and a key or a generic person doesn't say "you drive" / "we drive you".
 *
 *  - SelfDriveIcon — a steering wheel: you drive.
 *  - ChauffeurIcon — a chauffeur's peaked cap: you're driven.
 *
 * @param {number} [size=16]
 * @param {string} [className]
 */
function Svg({ size = 16, className = '', children, ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  );
}

export function SelfDriveIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 14.5V22" />
      <path d="M9.6 11.3 2.4 9.6" />
      <path d="m14.4 11.3 7.2-1.7" />
    </Svg>
  );
}

export function ChauffeurIcon(props) {
  return (
    <Svg {...props}>
      {/* crown of the cap */}
      <path d="M4 12.5C4 8.4 7.6 5.5 12 5.5s8 2.9 8 7" />
      {/* the band */}
      <path d="M4 12.5h16v2.5H4z" />
      {/* the peak */}
      <path d="M6.5 15c1.2 2.2 3.2 3.5 5.5 3.5s4.3-1.3 5.5-3.5" />
      {/* the badge */}
      <circle cx="12" cy="9.2" r="1" />
    </Svg>
  );
}
