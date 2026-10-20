import React from 'react';
import { MapPin, Star, Fuel, Gauge, Users, UserRound, Car, Snowflake, ShieldCheck, CalendarClock, Palette } from 'lucide-react';
import { ratingOrDefault } from '../../lib/ratings';
import Badge from '../ui/Badge';
import PriceDisplay from '../ui/PriceDisplay';
import AuthImage from './AuthImage';
import { VEHICLE_TIERS } from '../../lib/constants';
import { formatDateTime } from '../../lib/utils';
import { tripTypeLabel } from '../../lib/vehicleOptions';

const SPEC_ICONS = { fuelType: Fuel, transmissionType: Gauge, capacity: Users, color: Palette };

const CHIP = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-brand-white text-xs font-medium';

function titleCase(value) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/**
 * Everything the backend's `VehicleResponse` says about a vehicle: model, location,
 * rating, fuel, transmission, seats, colour, self-drive / chauffeured, air
 * conditioning, insurance, the trip types it suits, when it can be booked, and the
 * daily price. The registration number, VIN and insurance sticker photo are only
 * shown to the vehicle's owner.
 *
 * @param {object} vehicle — same shape as VehicleCard's, plus `description`,
 *   `color`, `tripTypes`, `selfDrive`, `chauffeured`, `hasWorkingAC`,
 *   `comprehensiveInsurance`, `available`, `availableFrom` / `availableTo`,
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

  const specs = [
    fuelType && { key: 'fuelType', label: titleCase(fuelType) },
    transmissionType && { key: 'transmissionType', label: titleCase(transmissionType) },
    capacity && { key: 'capacity', label: `${capacity} seats` },
    color && { key: 'color', label: color },
  ].filter(Boolean);

  const hasWindow = !!(availableFrom || availableTo);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="min-w-0 break-words font-heading text-brand-white text-2xl sm:text-3xl font-bold">{model}</h1>
          {tier === VEHICLE_TIERS.EXECUTIVE && <Badge label="Executive" variant="gold" className="shrink-0 mt-1.5" />}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-brand-grey">
          <span className="inline-flex items-center gap-1 text-brand-gold">
            <Star size={13} fill="currentColor" aria-hidden="true" />
            <span className="font-semibold">{ratingOrDefault(rating).toFixed(1)}</span>
            {typeof tripCount === 'number' && <span className="text-brand-grey">({tripCount} trips)</span>}
          </span>
          {location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} aria-hidden="true" />
              {location}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {specs.map((spec) => {
          const Icon = SPEC_ICONS[spec.key];
          return (
            <span key={spec.key} className={CHIP}>
              <Icon size={13} className="text-brand-gold" aria-hidden="true" />
              {spec.label}
            </span>
          );
        })}
        {selfDrive && (
          <span className={CHIP}>
            <Car size={13} className="text-brand-gold" aria-hidden="true" />
            Self-Drive Available
          </span>
        )}
        {chauffeured && (
          <span className={CHIP}>
            <UserRound size={13} className="text-brand-gold" aria-hidden="true" />
            Chauffeured Available
          </span>
        )}
        {hasWorkingAC && (
          <span className={CHIP}>
            <Snowflake size={13} className="text-brand-gold" aria-hidden="true" />
            Air Conditioning
          </span>
        )}
        {comprehensiveInsurance && (
          <span className={CHIP}>
            <ShieldCheck size={13} className="text-brand-gold" aria-hidden="true" />
            Comprehensive Insurance
          </span>
        )}
      </div>

      {Array.isArray(tripTypes) && tripTypes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-brand-white">Suited for</p>
          <ul className="flex flex-wrap gap-1.5" aria-label="Suited for">
            {tripTypes.map((t) => (
              <li key={t} className="px-2.5 py-1 rounded-full bg-brand-gold/10 text-brand-gold text-xs font-medium">
                {tripTypeLabel(t)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {typeof available === 'boolean' && (
        <p className="inline-flex items-start gap-1.5 text-brand-grey text-xs">
          <CalendarClock size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {!available
              ? 'Not available for booking right now.'
              : hasWindow
              ? `Available${availableFrom ? ` from ${formatDateTime(availableFrom)}` : ''}${availableTo ? ` until ${formatDateTime(availableTo)}` : ''}.`
              : 'Available any time.'}
          </span>
        </p>
      )}

      {description && <p className="text-brand-grey text-sm leading-relaxed">{description}</p>}

      {isOwner && (registrationNumber || vin || insuranceVerificationStickerPhoto) && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col gap-2 text-xs text-brand-grey">
          <p className="text-brand-white font-medium text-sm">Your vehicle's details (only you can see these)</p>
          {registrationNumber && (
            <p>
              Registration number: <span className="text-brand-white">{registrationNumber}</span>
            </p>
          )}
          {vin && (
            <p>
              VIN: <span className="text-brand-white">{vin}</span>
            </p>
          )}
          {insuranceVerificationStickerPhoto && (
            <div className="flex items-center gap-2">
              <div className="w-20 h-14 rounded-md overflow-hidden bg-white/5 shrink-0">
                <AuthImage
                  src={insuranceVerificationStickerPhoto}
                  alt="Insurance sticker"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  fallback={
                    <div className="w-full h-full flex items-center justify-center">
                      <ShieldCheck size={18} className="text-brand-gold/60" aria-hidden="true" />
                    </div>
                  }
                />
              </div>
              <span>Insurance sticker on file</span>
            </div>
          )}
        </div>
      )}

      <div className="pt-4 border-t border-white/10">
        <PriceDisplay amount={dailyPrice} size="lg" />
      </div>
    </div>
  );
}
