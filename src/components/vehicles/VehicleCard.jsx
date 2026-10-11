import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Star, Fuel, Gauge, Users } from 'lucide-react';
import { ratingOrDefault } from '../../lib/ratings';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import PriceDisplay from '../ui/PriceDisplay';
import GenericVehiclePlaceholder from './GenericVehiclePlaceholder';
import AuthImage from './AuthImage';
import { VEHICLE_TIERS } from '../../lib/constants';
import { isNewListing } from '../../lib/vehicleRanking';

/**
 * @param {object} vehicle — { id, model, tier, dailyPrice, rating, tripCount,
 *   fuelType, transmissionType, capacity, location, photos }
 */
export default function VehicleCard({ vehicle }) {
  const {
    id,
    model,
    tier,
    dailyPrice,
    rating,
    tripCount,
    fuelType,
    transmissionType,
    capacity,
    location,
    photos,
    isBooked,
  } = vehicle;

  const photo = photos?.[0]?.url || photos?.[0];
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden flex flex-col hover:border-brand-gold/40 hover:-translate-y-0.5 transition-all duration-200">
      <Link
        to={`/vehicles/${id}`}
        aria-label={`View ${model}`}
        className="relative aspect-[16/10] bg-white/5 block focus-ring"
      >
        {photo ? (
          <AuthImage
            src={photo}
            alt={model}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            fallback={<GenericVehiclePlaceholder tier={tier} />}
          />
        ) : (
          <GenericVehiclePlaceholder tier={tier} />
        )}
        {(tier === VEHICLE_TIERS.EXECUTIVE || isNewListing(vehicle)) && (
          <span className="absolute top-3 left-3 flex gap-1.5">
            {tier === VEHICLE_TIERS.EXECUTIVE && <Badge label="Executive" variant="gold" />}
            {isNewListing(vehicle) && <Badge label="New" variant="success" />}
          </span>
        )}
        {isBooked && <Badge label="Booked" variant="danger" size="lg" className="absolute top-3 right-3 uppercase tracking-wide shadow-lg" />}
      </Link>

      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/vehicles/${id}`} className="focus-ring rounded-md">
            <h3 className="font-heading text-brand-white font-semibold leading-snug hover:text-brand-gold transition-colors">
              {model}
            </h3>
          </Link>
          <span className="flex items-center gap-1 text-xs text-brand-gold shrink-0 mt-0.5">
            <Star size={12} fill="currentColor" aria-hidden="true" />
            <span className="font-semibold">{ratingOrDefault(rating).toFixed(1)}</span>
            {typeof tripCount === 'number' && <span className="text-brand-grey">({tripCount})</span>}
          </span>
        </div>

        {location && (
          <div className="flex items-center gap-1.5 text-brand-grey text-xs">
            <MapPin size={12} aria-hidden="true" />
            <span>{location}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-brand-grey text-xs">
          {fuelType && (
            <span className="inline-flex items-center gap-1">
              <Fuel size={12} aria-hidden="true" />
              {fuelType.charAt(0) + fuelType.slice(1).toLowerCase()}
            </span>
          )}
          {transmissionType && (
            <span className="inline-flex items-center gap-1">
              <Gauge size={12} aria-hidden="true" />
              {transmissionType.charAt(0) + transmissionType.slice(1).toLowerCase()}
            </span>
          )}
          {capacity && (
            <span className="inline-flex items-center gap-1">
              <Users size={12} aria-hidden="true" />
              {capacity} seats
            </span>
          )}
        </div>

        <div className="mt-auto pt-3 flex items-center justify-between gap-3">
          <PriceDisplay amount={dailyPrice} size="sm" />
          <Button size="sm" onClick={() => navigate(`/vehicles/${id}`)}>
            {isBooked ? 'View Details' : 'Book'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
