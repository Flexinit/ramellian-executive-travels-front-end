import React from 'react';
import { Binoculars, BriefcaseBusiness, Cake, Gem, PlaneTakeoff, Route, Users } from 'lucide-react';
import { SelfDriveIcon } from './TripModeIcons';
import { TRIP_TYPES } from '../../lib/constants';
import { tripTypeLabel } from '../../lib/vehicleOptions';

/**
 * One icon per trip type, so a trip type reads at a glance wherever it shows (chips, "Suited for", booking
 * details). Self-Drive Rental reuses the steering wheel of the Self-Drive booking mode, so the two match.
 */
const ICONS = {
  [TRIP_TYPES.GENERAL]: Route, // any trip
  [TRIP_TYPES.AIRPORT_TRANSFER]: PlaneTakeoff,
  [TRIP_TYPES.WEDDING]: Gem, // the ring
  [TRIP_TYPES.CORPORATE]: BriefcaseBusiness,
  [TRIP_TYPES.SAFARI]: Binoculars,
  [TRIP_TYPES.FAMILY_JOURNEY]: Users,
  [TRIP_TYPES.SELF_DRIVE_RENTAL]: SelfDriveIcon,
  [TRIP_TYPES.CAKE_TRANSPORTATION]: Cake,
};

/**
 * The icon for a trip type — a value the portal doesn't know gets the General route icon. Decorative
 * (`aria-hidden`): the label beside it says what it is.
 *
 * @param {string} type — a `TRIP_TYPES` value
 * @param {number} [size=14]
 * @param {string} [className]
 */
export default function TripTypeIcon({ type, size = 14, className = '' }) {
  const Icon = ICONS[type] || Route;
  return <Icon size={size} className={`shrink-0 ${className}`} aria-hidden="true" />;
}

/**
 * A trip type as icon + label, for inside a chip, a list item or a detail row.
 *
 * @param {string} type — a `TRIP_TYPES` value
 * @param {number} [size=14] — the icon's size
 * @param {string} [className] — layout only
 */
export function TripTypeLabel({ type, size = 14, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <TripTypeIcon type={type} size={size} />
      {tripTypeLabel(type)}
    </span>
  );
}
