import React, { useEffect, useState } from 'react';
import { FONTS, fontStack } from '../../theme/fonts';

// Shown at least this long so the animation isn't just a flash on fast
// connections, but never longer than this even if a resource stalls —
// a splash screen must never be able to trap the user.
const MIN_DISPLAY_MS = 900;
const MAX_DISPLAY_MS = 4000;
const FADE_MS = 300;

const SPOKE_ANGLES = [
  { x1: 7, y1: 0, x2: 16, y2: 0 },
  { x1: 2.2, y1: 6.7, x2: 4.9, y2: 15.2 },
  { x1: -5.7, y1: 4.1, x2: -12.9, y2: 9.4 },
  { x1: -5.7, y1: -4.1, x2: -12.9, y2: -9.4 },
  { x1: 2.2, y1: -6.7, x2: 4.9, y2: -15.2 },
];

function Wheel({ cx, cy }) {
  return (
    <g className="animate-spin" style={{ transformOrigin: `${cx}px ${cy}px`, animationDuration: '0.9s' }}>
      <circle cx={cx} cy={cy} r={20} fill="#16213E" stroke="#16213E" strokeWidth={3} />
      {SPOKE_ANGLES.map((s, i) => (
        <line
          key={i}
          x1={cx + s.x1}
          y1={cy + s.y1}
          x2={cx + s.x2}
          y2={cy + s.y2}
          stroke="#F5F5F5"
          strokeWidth={2}
          strokeLinecap="round"
        />
      ))}
      <circle cx={cx} cy={cy} r={6.5} fill="#C9A84C" />
    </g>
  );
}

/**
 * Full-screen splash shown on first load — a Rolls-Royce Cullinan-style
 * silhouette (long flat hood, upright Parthenon grille, round headlamp,
 * tall SUV cabin with a near-vertical rear/tailgate) drawn as an outline
 * only — navy strokes, no solid fill — with two spinning wheels. The
 * wordmark is set directly on the car's door panel rather than as separate
 * text underneath. Stays up until the page has actually finished loading
 * (images, fonts, styles — via the `load` event) rather than a fixed
 * guess. Rendered as a sibling overlay above `<App>` in main.jsx: the app
 * mounts and renders underneath immediately, this just covers it until
 * ready.
 */
export default function PageLoader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const start = Date.now();
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      const remaining = Math.max(MIN_DISPLAY_MS - (Date.now() - start), 0);
      window.setTimeout(() => {
        setFading(true);
        window.setTimeout(() => setVisible(false), FADE_MS);
      }, remaining);
    }

    if (document.readyState === 'complete') {
      finish();
    } else {
      window.addEventListener('load', finish);
    }
    const safety = window.setTimeout(finish, MAX_DISPLAY_MS);

    return () => {
      window.removeEventListener('load', finish);
      window.clearTimeout(safety);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={fading}
      className={`fixed inset-0 z-[100] bg-canvas flex flex-col items-center justify-center transition-opacity duration-300 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <span className="sr-only">Loading Ramellian Executive Travels…</span>

      <svg width="280" height="170" viewBox="0 0 300 170" aria-hidden="true">
        <ellipse cx="163" cy="132" rx="125" ry="7" fill="#16213E" opacity="0.1" />

        {/* Body — taller, SUV-proportioned; outline only, no fill */}
        <rect x="20" y="62" width="240" height="36" rx="6" fill="none" stroke="#16213E" strokeWidth="3" />

        {/* Long flat hood — Rolls-Royce keeps its long-bonnet language even on the SUV */}
        <path d="M167,62 L178,50 L245,50 L258,62 Z" fill="none" stroke="#16213E" strokeWidth="2.5" />

        {/* Cullinan's signature near-vertical rear (tailgate), flat roof, and raked windshield */}
        <path d="M60,62 L64,26 Q66,22 72,22 L145,22 Q152,23 156,30 L167,52" fill="none" stroke="#16213E" strokeWidth="2.5" />

        {/* Upright "Parthenon" grille at the leading edge */}
        <rect x="256" y="54" width="11" height="34" rx="1" fill="none" stroke="#16213E" strokeWidth="2" />
        {[259, 262, 265].map((x) => (
          <line key={x} x1={x} y1="57" x2={x} y2="83" stroke="#16213E" strokeWidth="1" opacity="0.6" />
        ))}

        {/* Round headlamp */}
        <circle cx="248" cy="64" r="5" fill="none" stroke="#16213E" strokeWidth="1.5" />

        {/* Wordmark, set on the door panel between the wheels like a coachline badge */}
        <text
          x="162"
          y="87"
          textAnchor="middle"
          fill="#16213E"
          fontSize="14"
          fontWeight="700"
          letterSpacing="1.5"
          style={{ fontFamily: fontStack(FONTS.heading).join(', ') }}
        >
          RAMELLIAN
        </text>

        <Wheel cx={95} cy={100} />
        <Wheel cx={230} cy={100} />

        <text
          x="163"
          y="155"
          textAnchor="middle"
          fill="#6B6B6B"
          fontSize="11"
          fontWeight="600"
          letterSpacing="3"
          style={{ fontFamily: fontStack(FONTS.body).join(', ') }}
        >
          EXECUTIVE TRAVELS
        </text>
      </svg>

      <span className="text-muted/70 text-xs -mt-2">Preparing your journey…</span>
    </div>
  );
}
