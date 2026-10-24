import React from 'react';
import AuthImage from '../vehicles/AuthImage';
import GenericVehiclePlaceholder from '../vehicles/GenericVehiclePlaceholder';
import { useBooking } from '../../hooks/useBookings';
import { useVehicle } from '../../hooks/useVehicles';

/**
 * A small thumbnail of the vehicle a booking notification is about — the notification itself only
 * carries a `referenceId` (the booking), not the vehicle or its photo, so this looks both up
 * (`GET /bookings/{id}` then `GET /vehicles/{id}`) purely to render the picture. Renders nothing
 * while loading or if either fetch fails, so a slow or missing photo never blocks the notification
 * text from being readable — this is decoration, not the point of the row.
 *
 * @param {string} bookingId
 */
export default function NotificationVehiclePhoto({ bookingId }) {
  const { data: booking } = useBooking(bookingId);
  const { data: vehicle } = useVehicle(booking?.vehicleId);
  const photo = vehicle?.photos?.[0];
  const photoUrl = typeof photo === 'string' ? photo : photo?.url;

  if (!vehicle) return null;

  return (
    <span className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-black/5">
      {photoUrl ? (
        <AuthImage
          src={photoUrl}
          alt={vehicle.model || 'Vehicle'}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          fallback={<GenericVehiclePlaceholder tier={vehicle?.tier} />}
        />
      ) : (
        <GenericVehiclePlaceholder tier={vehicle?.tier} />
      )}
    </span>
  );
}
