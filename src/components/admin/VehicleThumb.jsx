import React from 'react';
import { Car } from 'lucide-react';
import AuthImage from '../vehicles/AuthImage';

/**
 * A small picture of a vehicle for a list row: its first photo, opening the photos when clicked, or — when no photo
 * can be shown — a plain placeholder that says so.
 *
 * @param {{ model: string, photos?: Array<{ url: string }> }} vehicle
 * @param {(vehicle: object) => void} onOpen
 */
export default function VehicleThumb({ vehicle, onOpen }) {
  const photos = Array.isArray(vehicle.photos) ? vehicle.photos : [];

  if (photos.length === 0) {
    return (
      <span
        role="img"
        aria-label={`No photos available for ${vehicle.model}`}
        title="No photos to show — the backend doesn't list a vehicle's photos, so only ones uploaded from this browser can be shown."
        className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-brand-grey"
      >
        <Car size={20} aria-hidden="true" />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(vehicle)}
      aria-label={`View photos of ${vehicle.model} (${photos.length})`}
      className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 focus-ring hover:border-brand-gold/60 transition-colors"
    >
      <AuthImage
        src={photos[0].url}
        alt=""
        className="h-full w-full object-cover"
        fallback={<span className="flex h-full w-full items-center justify-center bg-white/5 text-brand-grey"><Car size={20} aria-hidden="true" /></span>}
      />
      {photos.length > 1 && (
        <span aria-hidden="true" className="absolute bottom-0 right-0 rounded-tl-md bg-black/70 px-1 text-[10px] font-semibold text-white">
          {photos.length}
        </span>
      )}
    </button>
  );
}
