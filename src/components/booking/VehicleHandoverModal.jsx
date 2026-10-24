import React from 'react';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import VehicleHandoverForm from './VehicleHandoverForm';
import { useRecordPickup, useRecordReturn } from '../../hooks/useVehicleHandover';
import { useExistingPaymentCheck } from '../../hooks/usePayment';
import { PAYMENT_STATUSES } from '../../lib/constants';

/**
 * Wraps `VehicleHandoverForm` with the one rule that applies before it can even be filled in: a vehicle
 * can't be collected until its booking is actually paid for. Checked against the real payment record
 * (the same source PaymentPage/GroupPaymentPage trust over everything else — see docs/backend-requests.md
 * item 20), not the booking's own `status`, which doesn't reliably mean "paid" on this backend. Return
 * has no such gate — by the time a booking is ACTIVE (out with the renter), payment already had to have
 * cleared to get there.
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {string} bookingId
 * @param {'pickup'|'return'} type
 * @param {() => void} [onRecorded] - fires once the handover is actually saved, after `onClose`; the
 *   caller uses this to chain straight into the next thing (e.g. prompting for a review right after a
 *   return, rather than waiting for the booking to separately refetch as COMPLETED).
 */
export default function VehicleHandoverModal({ isOpen, onClose, bookingId, type, onRecorded }) {
  const recordPickup = useRecordPickup();
  const recordReturn = useRecordReturn();
  const mutation = type === 'pickup' ? recordPickup : recordReturn;

  const checkPayment = type === 'pickup' && isOpen;
  const paymentCheck = useExistingPaymentCheck(bookingId, checkPayment);
  const paid = !checkPayment || paymentCheck.status === PAYMENT_STATUSES.SUCCESSFUL;

  function handleSubmit(details) {
    mutation.mutate(
      { bookingId, ...details },
      {
        onSuccess: () => {
          onClose();
          onRecorded?.();
        },
      }
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={type === 'pickup' ? 'Record Vehicle Pickup' : 'Record Vehicle Return'} size="lg">
      {checkPayment && paymentCheck.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" label="Checking payment status" />
        </div>
      ) : !paid ? (
        <p className="text-sm text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          This booking hasn&apos;t been paid for yet — the vehicle can&apos;t be collected until payment is confirmed.
        </p>
      ) : (
        <VehicleHandoverForm type={type} onSubmit={handleSubmit} pending={mutation.isPending} />
      )}
    </Modal>
  );
}
