import React from 'react';
import { Car } from 'lucide-react';
import { useVehicle } from '../../hooks/useVehicles';

/**
 * "Which vehicle is this for?" — a document that belongs to a vehicle carries only its id, so this looks the
 * vehicle up (`GET /vehicles/{id}`) and shows its model, registration and owner.
 * @param {string} vehicleId
 */
export default function VehicleTag({ vehicleId }) {
  const { data: vehicle, isError } = useVehicle(vehicleId);
  if (!vehicleId) return null;

  return (
    <p className="flex items-start gap-2 rounded-lg bg-ink/5 px-3 py-2 text-xs text-muted">
      <Car size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
      {vehicle ? (
        <span className="min-w-0 break-words">
          For <span className="text-ink font-medium">{vehicle.model}</span> · {vehicle.registrationNumber}
          {vehicle.ownerEmail ? ` · owner ${vehicle.ownerEmail}` : ''}
        </span>
      ) : (
        <span>{isError ? 'For a vehicle that could not be found' : 'Finding the vehicle…'}</span>
      )}
    </p>
  );
}
