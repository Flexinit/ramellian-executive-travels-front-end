import React, { useState } from 'react';
import { Car, Fuel, Gauge, ImageOff, MapPin, ShieldAlert, ShieldCheck, Snowflake, Users } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Textarea from '../ui/Textarea';
import AuthImage from '../vehicles/AuthImage';
import InsuranceStickerReview from './InsuranceStickerReview';
import { useReviewVehicle } from '../../hooks/useVehicles';
import { approvalLabel, approvalOf, approvalVariant } from '../../lib/vehicleApproval';
import { formatCurrency, formatDateTime } from '../../lib/utils';

const titleCase = (value) => (value ? value.charAt(0) + value.slice(1).toLowerCase() : '');

/** A small pill with an icon: one fact about the vehicle. */
function Chip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-brand-white">
      <Icon size={12} className="text-brand-gold" aria-hidden="true" />
      {children}
    </span>
  );
}

/**
 * A vehicle waiting for (or already given) an administrator's decision, as a card: its photo, price and key facts as pills,
 * its insurance state with the automatic sticker/QR check, a note for the owner, and Approve / Reject
 * (`PUT /vehicles/admin/{id}/review`). A decided vehicle can be changed to the other decision.
 *
 * @param {object} vehicle — a `VehicleResponse`
 */
export default function VehicleReviewCard({ vehicle }) {
  const review = useReviewVehicle();
  const [notes, setNotes] = useState(vehicle.approvalNotes || '');
  const [showPhotos, setShowPhotos] = useState(false);
  const [showSticker, setShowSticker] = useState(false);
  const status = approvalOf(vehicle);
  const decided = vehicle.approvalStatus === 'APPROVED' || vehicle.approvalStatus === 'REJECTED';
  const photos = Array.isArray(vehicle.photos) ? vehicle.photos : [];
  const decide = (next) => review.mutate({ vehicle, status: next, notes: notes.trim() });
  const busy = review.isPending;
  const insured = !!vehicle.comprehensiveInsurance;
  const hasSticker = !!vehicle.insuranceVerificationStickerPhoto;
  const modes = [vehicle.selfDrive && 'Self-drive', vehicle.chauffeured && 'Chauffeured'].filter(Boolean).join(' + ');

  return (
    <Card className="overflow-hidden p-0 transition-colors hover:border-brand-gold/30">
      <div className="grid md:grid-cols-[15rem_1fr]">
        {/* Photo */}
        <div className="relative min-h-44 bg-black/30 md:min-h-full">
          {photos.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowPhotos(true)}
              aria-label={`View photos of ${vehicle.model} (${photos.length})`}
              className="group absolute inset-0 focus-ring"
            >
              <AuthImage
                src={photos[0].url}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                fallback={<span className="flex h-full w-full items-center justify-center text-brand-grey"><Car size={36} aria-hidden="true" /></span>}
              />
              <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</span>
            </button>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-brand-grey">
              <ImageOff size={30} aria-hidden="true" />
              <p className="text-xs">No photos to show — the backend doesn&apos;t send a vehicle&apos;s photos, so only ones uploaded from this browser can be shown.</p>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex min-w-0 flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-heading text-brand-white text-xl font-semibold leading-tight">{vehicle.model}</h2>
              <p className="mt-0.5 break-all text-xs text-brand-grey">{`${vehicle.registrationNumber} · ${vehicle.ownerEmail || 'unknown owner'}`}</p>
            </div>
            <Badge label={approvalLabel(vehicle)} variant={approvalVariant(vehicle)} className="shrink-0" />
          </div>

          <p className="flex items-baseline gap-1.5">
            <span className="font-heading text-2xl font-bold text-brand-gold">{vehicle.pricePerDay != null ? formatCurrency(vehicle.pricePerDay) : '—'}</span>
            <span className="text-xs text-brand-grey">per day</span>
          </p>

          <div className="flex flex-wrap gap-2" aria-label="Key facts">
            {vehicle.location && <Chip icon={MapPin}>{vehicle.location}</Chip>}
            {vehicle.capacity != null && <Chip icon={Users}>{vehicle.capacity} seats</Chip>}
            {vehicle.fuelType && <Chip icon={Fuel}>{titleCase(vehicle.fuelType)}</Chip>}
            {vehicle.transmissionType && <Chip icon={Gauge}>{titleCase(vehicle.transmissionType)}</Chip>}
            {vehicle.hasWorkingAC && <Chip icon={Snowflake}>A/C</Chip>}
            {modes && <Chip icon={Car}>{modes}</Chip>}
            {vehicle.color && <Chip icon={Car}>{vehicle.color}</Chip>}
          </div>
          {vehicle.vin && <p className="text-xs text-brand-grey">VIN {vehicle.vin}</p>}

          {/* Insurance */}
          <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
              insured && hasSticker ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'
            }`}
          >
            <span className="flex items-center gap-2 text-sm text-brand-white">
              {insured && hasSticker ? <ShieldCheck size={16} className="text-green-400" aria-hidden="true" /> : <ShieldAlert size={16} className="text-yellow-400" aria-hidden="true" />}
              <Badge
                label={!insured ? 'No insurance' : hasSticker ? 'Insured · sticker' : 'Insured · no sticker'}
                variant={!insured ? 'danger' : hasSticker ? 'success' : 'warning'}
              />
            </span>
            {hasSticker && (
              <Button size="sm" onClick={() => setShowSticker(true)} aria-label={`Check the insurance sticker: ${vehicle.model}`}>
                <ShieldCheck size={14} aria-hidden="true" />
                Check sticker
              </Button>
            )}
          </div>

          {decided && (
            <p className="text-xs text-brand-grey">
              {approvalLabel(vehicle)}
              {vehicle.reviewedBy ? ` by ${vehicle.reviewedBy}` : ''}
              {vehicle.reviewedAt ? ` · ${formatDateTime(vehicle.reviewedAt)}` : ''}
            </p>
          )}

          <Textarea
            label="Note for the owner (optional)"
            name={`vehicle-notes-${vehicle.id}`}
            rows={2}
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            hint={status === 'REJECTED' ? 'The owner sees this, so say what needs fixing.' : undefined}
          />

          <div className="flex flex-wrap gap-3">
            {status !== 'APPROVED' && (
              <Button
                size="sm"
                aria-label={`Approve ${vehicle.model}`}
                disabled={busy}
                loading={busy && review.variables?.status === 'APPROVED'}
                onClick={() => decide('APPROVED')}
              >
                {decided ? 'Approve instead' : 'Approve'}
              </Button>
            )}
            {status !== 'REJECTED' && (
              <Button
                size="sm"
                variant="danger"
                aria-label={`Reject ${vehicle.model}`}
                disabled={busy}
                loading={busy && review.variables?.status === 'REJECTED'}
                onClick={() => decide('REJECTED')}
              >
                {decided ? 'Reject instead' : 'Reject'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={showPhotos} onClose={() => setShowPhotos(false)} title={`Photos — ${vehicle.model} (${vehicle.registrationNumber})`} size="xl">
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label={`Photos of ${vehicle.model}`}>
          {photos.map((photo, i) => (
            <li key={photo.url || i} className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
              <AuthImage
                src={photo.url}
                alt={`${vehicle.model} — photo ${i + 1}`}
                className="w-full max-h-96 object-contain"
                fallback={<p className="p-6 text-sm text-red-400 text-center">Couldn&apos;t load this photo.</p>}
              />
            </li>
          ))}
        </ul>
      </Modal>

      <Modal isOpen={showSticker} onClose={() => setShowSticker(false)} title={`Insurance sticker — ${vehicle.model} (${vehicle.registrationNumber})`} size="xl">
        {showSticker && <InsuranceStickerReview vehicle={vehicle} />}
      </Modal>
    </Card>
  );
}
