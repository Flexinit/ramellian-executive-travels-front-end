import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Fuel, Gauge, Users, Car, Snowflake, ShieldCheck, CalendarClock, CalendarDays, Pencil } from 'lucide-react';
import { ratingOrDefault } from '../../lib/ratings';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { approvalLabel, approvalOf, approvalVariant } from '../../lib/vehicleApproval';
import PriceDisplay from '../ui/PriceDisplay';
import { formatDateTime } from '../../lib/utils';
import { isBookedNow } from '../../lib/vehicleBookings';
import AuthImage from './AuthImage';
import AvailabilitySwitch from './AvailabilitySwitch';
import VehicleCalendarModal from './VehicleCalendarModal';

function titleCase(value) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/**
 * An owner's view of one of their own vehicles, shaped to the backend's
 * `VehicleResponse` (`pricePerDay`, `registrationNumber`, `available`, …).
 * Deliberately separate from the renter-facing VehicleCard, which has a
 * "Book" button and reads a `dailyPrice` field the backend doesn't send.
 *
 * @param {'h2'|'h3'} headingLevel — the title's heading level; use `h2`
 *   directly under a page `h1`, `h3` when nested under a section heading.
 * @param {Array<{id: string, start: Date, end: Date, status: string}>} [bookings] — the periods this
 *   vehicle is booked (see lib/vehicleBookings.js's `bookedPeriods`); summarised here and shown in full,
 *   as a real calendar, via "View Calendar" (`VehicleCalendarModal`).
 * @param {(vehicle: object, available: boolean) => void} [onToggleAvailable] — when given, shows a
 *   one-click "Available for booking" switch.
 * @param {boolean} [togglePending] — disables the switch while an update is in flight.
 * @param {string} [editTo] — when given, shows an Edit button linking there.
 *   The vehicle's approval state (`approvalStatus`, `approvalNotes`) is shown when the backend sends it.
 * @param {object} vehicle — { id, model, registrationNumber, location,
 *   pricePerDay, rating, available, capacity, fuelType, transmissionType,
 *   selfDrive, chauffeured, hasWorkingAC, comprehensiveInsurance, availableFrom, availableTo, insuranceVerificationStickerPhoto }
 */
export default function OwnerVehicleCard({
  vehicle,
  bookings = [],
  onToggleAvailable,
  togglePending = false,
  editTo,
  headingLevel: Heading = 'h3',
}) {
  const {
    id,
    model,
    color,
    registrationNumber,
    location,
    pricePerDay,
    rating,
    available,
    capacity,
    fuelType,
    transmissionType,
    selfDrive,
    chauffeured,
    hasWorkingAC,
    comprehensiveInsurance,
    availableFrom,
    availableTo,
    insuranceVerificationStickerPhoto,
    photos,
    approvalStatus,
    approvalNotes,
  } = vehicle;
  const photo = photos?.[0]?.url || photos?.[0];
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <Card className="p-5 flex flex-col gap-3 hover:border-accent/40 transition-colors">
      {photo && (
        <div className="aspect-[16/9] rounded-lg overflow-hidden bg-ink/5 -mt-1">
          <AuthImage
            src={photo}
            alt={`${model}`}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            fallback={<div className="w-full h-full flex items-center justify-center"><Car size={28} className="text-accent/60" aria-hidden="true" /></div>}
          />
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <Car size={18} className="text-accent" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <Link to={`/vehicles/${id}`} className="focus-ring rounded-md">
            <Heading className="font-heading text-ink font-semibold leading-snug hover:text-accent transition-colors truncate">
              {model}
            </Heading>
          </Link>
          {registrationNumber && <p className="text-muted text-xs mt-0.5">{registrationNumber}</p>}
        </div>
        {isBookedNow(bookings) ? (
          <Badge label="Booked now" variant="warning" />
        ) : (
          typeof available === 'boolean' && (
            <Badge label={available ? 'Available' : 'Not listed yet'} variant={available ? 'success' : 'neutral'} />
          )
        )}
      </div>

      {approvalStatus !== undefined && approvalOf(vehicle) !== 'APPROVED' && (
        <div
          role="note"
          className={`rounded-lg px-3 py-2 text-xs flex flex-col gap-1 ${
            approvalOf(vehicle) === 'REJECTED' ? 'bg-red-500/10 text-red-700' : 'bg-yellow-500/10 text-yellow-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Badge label={approvalLabel(vehicle)} variant={approvalVariant(vehicle)} />
            Renters can&apos;t see it until an administrator approves it.
          </span>
          {approvalOf(vehicle) === 'REJECTED' && approvalNotes && <span>Reason: {approvalNotes}</span>}
        </div>
      )}

      {location && (
        <div className="flex items-center gap-1.5 text-muted text-xs">
          <MapPin size={12} aria-hidden="true" />
          <span>{location}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted text-xs">
        {fuelType && (
          <span className="inline-flex items-center gap-1">
            <Fuel size={12} aria-hidden="true" />
            {titleCase(fuelType)}
          </span>
        )}
        {transmissionType && (
          <span className="inline-flex items-center gap-1">
            <Gauge size={12} aria-hidden="true" />
            {titleCase(transmissionType)}
          </span>
        )}
        {capacity && (
          <span className="inline-flex items-center gap-1">
            <Users size={12} aria-hidden="true" />
            {capacity} seats
          </span>
        )}
        {hasWorkingAC && (
          <span className="inline-flex items-center gap-1">
            <Snowflake size={12} aria-hidden="true" />
            A/C
          </span>
        )}
        {comprehensiveInsurance && (
          <span className="inline-flex items-center gap-1">
            <ShieldCheck size={12} aria-hidden="true" />
            Insured
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-accent">
          <Star size={12} fill="currentColor" aria-hidden="true" />
          {ratingOrDefault(rating).toFixed(1)}
        </span>
      </div>

      {insuranceVerificationStickerPhoto && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <div className="w-14 h-10 rounded-md overflow-hidden bg-ink/5 shrink-0">
            <AuthImage
              src={insuranceVerificationStickerPhoto}
              alt="Insurance sticker"
              className="w-full h-full object-cover"
              loading="lazy"
              fallback={<div className="w-full h-full flex items-center justify-center"><ShieldCheck size={16} className="text-accent/60" aria-hidden="true" /></div>}
            />
          </div>
          <span className="inline-flex items-center gap-1"><ShieldCheck size={12} aria-hidden="true" />Insurance sticker on file</span>
        </div>
      )}

      {(availableFrom || availableTo) ? (
        <p className="inline-flex items-center gap-1.5 text-muted text-xs">
          <CalendarClock size={12} aria-hidden="true" />
          Bookable
          {availableFrom && ` from ${formatDateTime(availableFrom)}`}
          {availableTo && ` until ${formatDateTime(availableTo)}`}
        </p>
      ) : (
        available === true && (
          <p className="inline-flex items-center gap-1.5 text-muted text-xs">
            <CalendarClock size={12} aria-hidden="true" />
            Available any time
          </p>
        )
      )}

      {typeof available === 'boolean' && onToggleAvailable && (
        <AvailabilitySwitch available={available} pending={togglePending} onToggle={(next) => onToggleAvailable(vehicle, next)} />
      )}
      {available === false && (
        <p className="text-xs text-muted">Renters can't see this vehicle — it isn't marked available.</p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {bookings.length === 0 ? 'No bookings yet.' : `${bookings.length} upcoming booking${bookings.length === 1 ? '' : 's'}`}
        </p>
        {bookings.length > 0 && (
          <Button size="sm" onClick={() => setCalendarOpen(true)}>
            <CalendarDays size={14} aria-hidden="true" />
            View Calendar
          </Button>
        )}
      </div>

      <VehicleCalendarModal isOpen={calendarOpen} onClose={() => setCalendarOpen(false)} vehicleModel={model} vehicleColor={color} periods={bookings} />

      {editTo && (
        <Button to={editTo} size="sm" className="self-start" aria-label={`Edit ${model}`}>
          <Pencil size={14} aria-hidden="true" />
          Edit
        </Button>
      )}

      <div className="mt-auto pt-3 flex items-center justify-between gap-3 flex-wrap">
        <PriceDisplay amount={pricePerDay} size="sm" />
        <div className="flex gap-1.5">
          {selfDrive && <Badge label="Self-Drive" variant="gold" />}
          {chauffeured && <Badge label="Chauffeured" variant="gold" />}
        </div>
      </div>
    </Card>
  );
}
