import React from 'react';
import { VEHICLE_TIERS } from '../../lib/constants';

/** Low, sleek profile — used for Executive-tier vehicles (Prado, VIP). */
function SedanSilhouette(props) {
  return (
    <svg viewBox="0 0 200 110" aria-hidden="true" {...props}>
      <rect x="10" y="55" width="180" height="28" rx="7" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M45,55 L58,28 Q62,23 68,23 L132,23 Q140,23 144,28 L158,55"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <line x1="100" y1="23" x2="98" y2="55" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <circle cx="55" cy="85" r="15" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="55" cy="85" r="5" fill="currentColor" />
      <circle cx="145" cy="85" r="15" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="145" cy="85" r="5" fill="currentColor" />
    </svg>
  );
}

/** Taller, boxier van/SUV profile — used for Standard-tier vehicles (Serena, Noah, Voxy, Touran). */
function VanSilhouette(props) {
  return (
    <svg viewBox="0 0 200 110" aria-hidden="true" {...props}>
      <rect x="10" y="50" width="180" height="32" rx="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M20,50 L24,20 Q26,17 30,17 L170,17 Q176,17 178,22 L182,50"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <line x1="75" y1="18" x2="73" y2="50" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <line x1="125" y1="18" x2="127" y2="50" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="55" cy="84" r="15" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="55" cy="84" r="5" fill="currentColor" />
      <circle cx="145" cy="84" r="15" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="145" cy="84" r="5" fill="currentColor" />
    </svg>
  );
}

/**
 * Fallback illustration shown wherever a vehicle has no uploaded photo yet
 * (a normal state for a fresh listing, not an error) — a generic line-art
 * car rather than a broken-image icon or an empty box. Deliberately muted
 * (a faint grey outline on the light grey image panel) so it reads clearly as a
 * placeholder, never mistaken for an actual photo of the vehicle.
 *
 * @param {'STANDARD'|'EXECUTIVE'} [tier] — picks a van vs. sedan silhouette
 * @param {string} [className]
 */
export default function GenericVehiclePlaceholder({ tier, className = '' }) {
  const Silhouette = tier === VEHICLE_TIERS.EXECUTIVE ? SedanSilhouette : VanSilhouette;

  return (
    <div
      className={`w-full h-full flex items-center justify-center bg-well ${className}`}
    >
      <Silhouette className="w-1/2 h-1/2 text-black/25" />
    </div>
  );
}
