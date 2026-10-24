import React, { useState } from 'react';
import { Car, Check } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import Spinner from '../ui/Spinner';
import { useChangeVehicle } from '../../hooks/useBookings';
import { useAdminVehicles, useMyVehicles, useVehicleAvailability } from '../../hooks/useVehicles';
import { BOOKING_STATUSES } from '../../lib/constants';
import { formatCurrency } from '../../lib/utils';

/**
 * Whether a booking's vehicle can still be swapped: it's Pending or Confirmed and the trip hasn't started.
 * @param {object} booking — `BookingResponse`
 */
export function canChangeVehicle(booking, now = Date.now()) {
  if (!booking) return false;
  const open = booking.status === BOOKING_STATUSES.PENDING || booking.status === BOOKING_STATUSES.CONFIRMED;
  return open && (!booking.startTime || new Date(booking.startTime).getTime() > now);
}

/** The cars free for the booking's dates — what a renter can switch to. */
function RenterChoices(props) {
  const { vehicles, isLoading } = useVehicleAvailability({ startTime: props.booking.startTime, endTime: props.booking.endTime });
  return <Choices {...props} vehicles={vehicles.filter((v) => !v.isBooked)} isLoading={isLoading} />;
}
/** The owner's own cars. */
function OwnerChoices(props) {
  const { vehicles, isLoading } = useMyVehicles();
  return <Choices {...props} vehicles={vehicles.filter((v) => v.available !== false)} isLoading={isLoading} />;
}
/** Every approved car on the platform — what an administrator can switch to. */
function AdminChoices(props) {
  const { data = [], isLoading } = useAdminVehicles('APPROVED');
  return <Choices {...props} vehicles={data} isLoading={isLoading} />;
}
const CHOICES = { renter: RenterChoices, owner: OwnerChoices, admin: AdminChoices };

function Choices({ booking, vehicles, isLoading, selected, onSelect }) {
  const currentId = booking.vehicleId || booking.vehicle?.id;
  const options = vehicles.filter((v) => v.id !== currentId);
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner label="Loading vehicles" />
      </div>
    );
  }
  if (options.length === 0) {
    return <p className="rounded-tile bg-subtle px-4 py-3 text-sm text-muted">There&apos;s no other vehicle to switch to for these dates.</p>;
  }
  return (
    <div role="radiogroup" aria-label="Choose the new vehicle" className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
      {options.map((v) => {
        const active = selected === v.id;
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(v.id)}
            className={`flex items-center gap-3 rounded-tile border p-3 text-left transition-colors focus-ring ${
              active ? 'border-accent bg-accent/5' : 'border-line bg-surface hover:border-accent/60'
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-subtle text-icon">
              <Car size={16} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold text-ink">{v.model}</span>
              <span className="truncate text-xs text-muted">
                {[v.location, v.capacity && `${v.capacity} seats`, v.dailyPrice != null && `${formatCurrency(v.dailyPrice)}/day`].filter(Boolean).join(' · ')}
              </span>
            </span>
            {active && <Check size={16} className="shrink-0 text-accent" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Swaps the vehicle on a booking (`PUT /bookings/{id}/change-vehicle`). Offered to the renter (cars free for the
 * booking's dates), the vehicle's owner (their own cars) and administrators (every approved car) while the trip
 * hasn't started — see `canChangeVehicle`. The backend has the final say; a reason is optional and is sent along.
 *
 * @param {object} booking — `BookingResponse`
 * @param {'renter'|'owner'|'admin'} scope — whose list of cars to offer
 * @param {boolean} isOpen
 * @param {function} onClose
 */
export default function ChangeVehicleModal({ booking, scope, isOpen, onClose }) {
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const change = useChangeVehicle();
  const List = CHOICES[scope] || RenterChoices;

  function close() {
    setSelected(null);
    setReason('');
    onClose();
  }

  function submit() {
    change.mutate({ bookingId: booking.id, vehicleId: selected, reason }, { onSuccess: close });
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title="Change vehicle" size="md">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Pick the vehicle this booking should use instead. The dates, places and everything else stay the same; the
          price may change with the new vehicle&apos;s daily rate.
        </p>
        {isOpen && <List booking={booking} selected={selected} onSelect={setSelected} />}
        <Textarea
          label="Reason (optional)"
          name="reason"
          rows={2}
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!selected} loading={change.isPending}>
            Change vehicle
          </Button>
        </div>
      </div>
    </Modal>
  );
}
