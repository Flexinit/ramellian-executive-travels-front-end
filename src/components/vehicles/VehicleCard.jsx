import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Star, Users, Gauge } from 'lucide-react';
import { ratingOrDefault } from '../../lib/ratings';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import GenericVehiclePlaceholder from './GenericVehiclePlaceholder';
import AuthImage from './AuthImage';
import { VEHICLE_TIERS } from '../../lib/constants';
import { isNewListing } from '../../lib/vehicleRanking';
import { formatCurrency } from '../../lib/utils';

const titleCase = (s) => s.charAt(0) + s.slice(1).toLowerCase();

/**
 * A vehicle in a listing — the Figma design system's car card ("Best Cars" / "Recommend For You"): a white card
 * with a grey outline and 15px corners; the photo on a light grey panel inset at the top; then the name, the
 * rating with its star, the location, one line of key specs, and the price per day beside a small "Book now" pill.
 * The photo is shown whole (contained, centred, a little padding) rather than cropped, so every car — whatever its
 * shape or the background it was photographed on — sits the same way in the panel. The specs never wrap (cards in a
 * row stay the same height): seats and gearbox, or just seats for a chauffeured-only car, since the renter won't be
 * driving it. Fuel is on the vehicle's own page.
 * Executive / New / Booked badges sit on the photo. (The design's heart button is left out: the portal has no
 * favourites to save to.)
 *
 * @param {object} vehicle — { id, model, tier, dailyPrice, rating, tripCount, fuelType, transmissionType,
 *   capacity, location, photos, isBooked }
 */
export default function VehicleCard({ vehicle }) {
  const { id, model, tier, dailyPrice, rating, tripCount, transmissionType, capacity, location, photos, isBooked, selfDrive, chauffeured } =
    vehicle;

  const photo = photos?.[0]?.url || photos?.[0];
  const navigate = useNavigate();
  const isNew = isNewListing(vehicle);
  const chauffeuredOnly = chauffeured && selfDrive === false;

  return (
    <article className="flex flex-col rounded-[15px] border border-line bg-surface p-1.5 transition-shadow duration-200 hover:shadow-card">
      <Link
        to={`/vehicles/${id}`}
        aria-label={`View ${model}`}
        className="relative block aspect-[4/3] overflow-hidden rounded-[11px] bg-well focus-ring"
      >
        {photo ? (
          <AuthImage
            src={photo}
            alt={model}
            className="h-full w-full object-contain p-2 mix-blend-multiply"
            loading="lazy"
            decoding="async"
            fallback={<GenericVehiclePlaceholder tier={tier} />}
          />
        ) : (
          <GenericVehiclePlaceholder tier={tier} />
        )}
        {(tier === VEHICLE_TIERS.EXECUTIVE || isNew) && (
          <span className="absolute left-2 top-2 flex gap-1.5">
            {tier === VEHICLE_TIERS.EXECUTIVE && <Badge label="Executive" variant="gold" />}
            {isNew && <Badge label="New" variant="success" />}
          </span>
        )}
        {isBooked && <Badge label="Booked" variant="danger" className="absolute right-2 top-2 uppercase tracking-wide" />}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 px-2 pb-1.5 pt-2.5">
        <Link to={`/vehicles/${id}`} className="focus-ring rounded-md">
          <h3 className="font-heading text-sm font-semibold leading-snug text-ink line-clamp-1">{model}</h3>
        </Link>

        <span className="flex items-center gap-1 text-xs font-semibold text-muted">
          {ratingOrDefault(rating).toFixed(1)}
          <Star size={12} className="text-star" fill="currentColor" aria-hidden="true" />
          {typeof tripCount === 'number' && <span className="font-normal">({tripCount})</span>}
        </span>

        {location && (
          <span className="flex items-center gap-1 text-xs text-muted">
            <MapPin size={12} className="shrink-0 text-icon" aria-hidden="true" />
            <span className="truncate">{location}</span>
          </span>
        )}

        {(capacity || (transmissionType && !chauffeuredOnly)) && (
          <span className="flex items-center gap-x-2.5 overflow-hidden whitespace-nowrap text-[11px] text-muted">
            {capacity && (
              <span className="inline-flex items-center gap-1">
                <Users size={12} className="text-icon" aria-hidden="true" />
                {capacity} Seats
              </span>
            )}
            {transmissionType && !chauffeuredOnly && (
              <span className="inline-flex items-center gap-1">
                <Gauge size={12} className="text-icon" aria-hidden="true" />
                {titleCase(transmissionType)}
              </span>
            )}
          </span>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <span className="whitespace-nowrap text-xs font-semibold text-ink">
            {formatCurrency(dailyPrice)}
            <span className="font-normal text-muted">/Day</span>
          </span>
          <Button size="xs" onClick={() => navigate(`/vehicles/${id}`)}>
            {isBooked ? 'View' : 'Book now'}
          </Button>
        </div>
      </div>
    </article>
  );
}
