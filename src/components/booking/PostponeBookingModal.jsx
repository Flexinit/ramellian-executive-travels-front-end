import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Spinner from '../ui/Spinner';
import { useEffectivePolicy, usePostponeBooking } from '../../hooks/useBookingPolicies';
import { apiErrorMessage } from '../../lib/apiError';

const pad = (n) => String(n).padStart(2, '0');
/** An ISO instant as the `datetime-local` box wants it, in the browser's own time zone. */
function toLocalInput(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Moves a booking to new dates under its owner's policy (`POST /booking-policies/bookings/{id}/postpone`). The
 * policy is checked first so the renter is told up front when it can't be done: the owner doesn't allow it, or
 * pick-up is closer than the policy's cut-off. The backend has the final word (e.g. too many moves already, or
 * the car is taken on the new dates) and its reason is shown.
 *
 * @param {boolean} isOpen @param {function} onClose
 * @param {object} booking — a `BookingResponse`
 */
export default function PostponeBookingModal({ isOpen, onClose, booking }) {
  const { data: policy, isLoading } = useEffectivePolicy(isOpen ? booking.id : null);
  const postpone = usePostponeBooking();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStart(toLocalInput(booking.startTime));
    setEnd(toLocalInput(booking.endTime));
    setProblem('');
    postpone.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, booking.id]);

  const hoursToPickup = (new Date(booking.startTime) - Date.now()) / 36e5;
  const notAllowed = policy && policy.postponementAllowed === false;
  const tooLate = policy && policy.postponementAllowed && hoursToPickup < Number(policy.postponementDeadlineHours ?? 0);

  function submit() {
    const s = new Date(start);
    const e = new Date(end);
    if (!start || !end || Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return setProblem('Choose the new pick-up and return.');
    if (s <= new Date()) return setProblem('The new pick-up must be in the future.');
    if (e <= s) return setProblem('The return must be after the pick-up.');
    setProblem('');
    postpone.mutate({ bookingId: booking.id, startTime: s.toISOString(), endTime: e.toISOString() }, { onSuccess: onClose });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Move dates">
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="flex justify-center py-4"><Spinner label="Checking the booking policy" /></div>
        ) : notAllowed ? (
          <p className="text-sm text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            This owner doesn't allow moving the dates. Message them if you need to change your trip.
          </p>
        ) : tooLate ? (
          <p className="text-sm text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            Dates can only be moved up to {policy.postponementDeadlineHours} hours before pick-up. Message the owner if
            you need help.
          </p>
        ) : (
          <>
            <p className="text-muted text-sm">
              Choose the new pick-up and return. The owner will be told.
              {policy?.maxPostponements != null && ` A booking can be moved at most ${policy.maxPostponements} time${policy.maxPostponements === 1 ? '' : 's'}.`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="New pick-up" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
              <Input label="New return" type="datetime-local" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
            </div>
            {(problem || postpone.isError) && (
              <p role="alert" className="text-sm text-red-600">{problem || apiErrorMessage(postpone.error, "Couldn't move the dates.")}</p>
            )}
          </>
        )}
        <div className="flex gap-3 justify-end">
          <Button onClick={onClose}>Close</Button>
          {!isLoading && !notAllowed && !tooLate && (
            <Button loading={postpone.isPending} onClick={submit}>Move dates</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
