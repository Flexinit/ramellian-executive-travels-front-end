import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import PesapalFrame from './PesapalFrame';
import { formatCurrency } from '../../lib/utils';

/**
 * Paying a booking's overstay charge in a dialog, with Pesapal's page inside it (PesapalFrame) rather than leaving the
 * portal for it. When it's finished the booking list is refreshed, so the charge shows as paid once confirmed.
 *
 * @param {string|null} url — the overstay checkout's `redirectUrl`; the dialog is open while it's set
 * @param {object} booking
 * @param {function} onClose
 */
export default function OverstayPaymentModal({ url, booking, onClose }) {
  const queryClient = useQueryClient();

  function done() {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    toast.success("Thanks — your overstay payment is being confirmed.");
    onClose();
  }

  return (
    <Modal isOpen={!!url} onClose={onClose} title={`Pay overstay ${formatCurrency(booking.overstayAmount ?? 0)}`} size="lg">
      {url && <PesapalFrame url={url} onDone={done} />}
    </Modal>
  );
}
