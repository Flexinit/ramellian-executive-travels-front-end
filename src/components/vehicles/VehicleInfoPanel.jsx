import React from 'react';
import { MapPin, Star, Fuel, Gauge, Users, Snowflake, ShieldCheck, CalendarClock, Palette } from 'lucide-react';
import { ratingOrDefault } from '../../lib/ratings';
import Badge from '../ui/Badge';
import PriceDisplay from '../ui/PriceDisplay';
import FeatureTile, { FeatureGrid } from '../ui/FeatureTile';
import { DetailList, DetailRow } from '../ui/DetailList';
import { SelfDriveIcon, ChauffeurIcon } from '../ui/TripModeIcons';
import AuthImage from './AuthImage';
import { VEHICLE_TIERS } from '../../lib/constants';
import { formatDateTime } from '../../lib/utils';
import { tripTypeLabel } from '../../lib/vehicleOptions';

function titleCase(value) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/**
 * Everything the backend's `VehicleResponse` says about a vehicle, laid out like the design system's Car Details
 * screen: the name with its rating on the right and the location and description under it; then "Car features" —
 * a grid of tiles (seats, fuel, gearbox, colour, how it can be driven, air conditioning, insurance — fuel and gearbox
 * left out for a chauffeured-only car); what it's
 * suited for; when it can be booked; and the daily price. The registration number, VIN and insurance sticker photo
 * are only shown to the vehicle's owner.
 *
 * @param {object} vehicle — same shape as VehicleCard's, plus `description`, `color`, `tripTypes`, `selfDrive`,
 *   `chauffeured`, `hasWorkingAC`, `comprehensiveInsurance`, `available`, `availableFrom` / `availableTo`,
 *   and (owner only) `registrationNumber`, `vin`, `insuranceVerificationStickerPhoto`.
 * @param {boolean} [isOwner] — the signed-in person owns this vehicle
 */
export default function VehicleInfoPanel({ vehicle, isOwner = false }) {
  const {
    model,
    tier,
    dailyPrice,
    rating,
    tripCount,
    fuelType,
    transmissionType,
    capacity,
    color,
    location,
    selfDrive,
    chauffeured,
    hasWorkingAC,
    comprehensiveInsurance,
    available,
    availableFrom,
    availableTo,
    tripTypes,
    registrationNumber,
    vin,
    insuranceVerificationStickerPhoto,
    description,
  } = vehicle;

  const driving = selfDrive && chauffeured ? 'Self-Drive or Chauffeured' : selfDrive ? 'Self-Drive' : chauffeured ? 'Chauffeured' : null;
  // A chauffeured-only car: the renter won't drive it, so fuel and gearbox aren't worth a tile.
  const chauffeuredOnly = chauffeured && !selfDrive;
  // The ones a renter decides on come first (the grid shows four, then "Show all").
  const features = [
    capacity && { icon: Users, label: 'Capacity', value: `${capacity} seats` },
    driving && { icon: chauffeured && !selfDrive ? ChauffeurIcon : SelfDriveIcon, label: 'Driving', value: driving },
    transmissionType && !chauffeuredOnly && { icon: Gauge, label: 'Gearbox', value: titleCase(transmissionType) },
    fuelType && !chauffeuredOnly && { icon: Fuel, label: 'Fuel', value: titleCase(fuelType) },
    color && { icon: Palette, label: 'Colour', value: color },
    hasWorkingAC && { icon: Snowflake, label: 'Comfort', value: 'Air Conditioning' },
    comprehensiveInsurance && { icon: ShieldCheck, label: 'Cover', value: 'Comprehensive Insurance' },
  ].filter(Boolean);

  const hasWindow = !!(availableFrom || availableTo);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words font-heading text-ink text-xl sm:text-2xl font-semibold">{model}</h1>
              {tier === VEHICLE_TIERS.EXECUTIVE && <Badge label="Executive" variant="gold" />}
            </div>
            {location && (
              <span className="mt-1 inline-flex items-center gap-1 text-sm text-muted">
                <MapPin size={13} className="text-icon" aria-hidden="true" />
                {location}
              </span>
            )}
          </div>
          {/* The design's rating, top right: the score with its star, and how many trips it rests on. */}
          <div className="shrink-0 flex flex-col items-end">
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink">
              {ratingOrDefault(rating).toFixed(1)}
              <Star size={14} className="text-star" fill="currentColor" aria-hidden="true" />
            </span>
            {typeof tripCount === 'number' && <span className="text-[11px] text-muted">({tripCount} trips)</span>}
          </div>
        </div>
        {description && <p className="text-muted text-sm leading-relaxed">{description}</p>}
      </div>

      {features.length > 0 && (
        <section aria-labelledby="car-features-heading" className="flex flex-col gap-3">
          <h2 id="car-features-heading" className="font-heading text-ink text-base font-semibold">Car features</h2>
          <FeatureGrid label="Car features" initialCount={4}>
            {features.map((f) => (
              <FeatureTile key={f.label} icon={f.icon} label={f.label} value={f.value} />
            ))}
          </FeatureGrid>
        </section>
      )}

      {Array.isArray(tripTypes) && tripTypes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-heading text-ink text-base font-semibold">Suited for</p>
          <ul className="flex flex-wrap gap-2" aria-label="Suited for">
            {tripTypes.map((t) => (
              <li key={t} className="px-3 py-1.5 rounded-full border border-line bg-surface text-ink text-xs font-medium">
                {tripTypeLabel(t)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {typeof available === 'boolean' && (
        <p className="inline-flex items-start gap-1.5 text-muted text-sm">
          <CalendarClock size={15} className="mt-0.5 shrink-0 text-icon" aria-hidden="true" />
          <span>
            {!available
              ? 'Not available for booking right now.'
              : hasWindow
              ? `Available${availableFrom ? ` from ${formatDateTime(availableFrom)}` : ''}${availableTo ? ` until ${formatDateTime(availableTo)}` : ''}.`
              : 'Available any time.'}
          </span>
        </p>
      )}

      {isOwner && (registrationNumber || vin || insuranceVerificationStickerPhoto) && (
        <div className="rounded-tile bg-subtle p-4 flex flex-col gap-3">
          <p className="text-ink font-semibold text-sm">Your vehicle&apos;s details (only you can see these)</p>
          <DetailList>
            <DetailRow label="Registration number" hidden={!registrationNumber}>{registrationNumber}</DetailRow>
            <DetailRow label="VIN" hidden={!vin} valueClassName="font-mono">{vin}</DetailRow>
          </DetailList>
          {insuranceVerificationStickerPhoto && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <div className="w-20 h-14 rounded-md overflow-hidden bg-surface shrink-0">
                <AuthImage
                  src={insuranceVerificationStickerPhoto}
                  alt="Insurance sticker"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  fallback={
                    <div className="w-full h-full flex items-center justify-center">
                      <ShieldCheck size={18} className="text-icon" aria-hidden="true" />
                    </div>
                  }
                />
              </div>
              <span>Insurance sticker on file</span>
            </div>
          )}
        </div>
      )}

      <div className="pt-4 border-t border-ink/10">
        <PriceDisplay amount={dailyPrice} size="lg" />
      </div>
    </div>
  );
}
