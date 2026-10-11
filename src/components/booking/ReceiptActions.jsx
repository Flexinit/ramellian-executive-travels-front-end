import React, { useState } from 'react';
import { Eye, Download } from 'lucide-react';
import { useBookingReceipt } from '../../hooks/usePayment';
import ReceiptModal from './ReceiptModal';

/**
 * Preview + Download for one booking's payment receipt — same split as `ContractPdfActions` (a labelled
 * Preview as the primary action, a small icon-only Download next to it), shown wherever a paid booking is —
 * the Receipt column on My/Fleet/All Bookings and report tables, and BookingDetailPage/PaymentStatusPanel.
 * Renders nothing until a *successful* payment is actually found for this booking (`useBookingReceipt`) —
 * never a loading flicker or an empty "Receipt" label on a booking that was never paid, e.g. Pending,
 * Cancelled, or Rejected.
 *
 * @param {object} booking @param {object} [vehicle] — see Receipt.jsx
 * @param {boolean} [enabled] — skip the lookup entirely for a booking whose status rules out a payment ever
 *   having happened (see `useBookingReceipt`'s own note)
 */
export default function ReceiptActions({ booking, vehicle, enabled = true }) {
  const { receipt } = useBookingReceipt(booking?.id, enabled);
  const [mode, setMode] = useState(null); // null | 'preview' | 'download'

  if (!receipt) return null;

  return (
    <>
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMode('preview');
          }}
          className="inline-flex items-center gap-1.5 text-brand-gold text-sm font-semibold hover:text-brand-gold-light transition-colors focus-ring rounded-md"
        >
          <Eye size={14} aria-hidden="true" />
          Receipt
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMode('download');
          }}
          aria-label="Download receipt"
          className="p-1.5 text-brand-grey hover:text-brand-white transition-colors focus-ring rounded-md"
        >
          <Download size={14} aria-hidden="true" />
        </button>
      </div>

      <ReceiptModal
        isOpen={!!mode}
        onClose={() => setMode(null)}
        booking={booking}
        vehicle={vehicle}
        receipt={receipt}
        autoPrint={mode === 'download'}
      />
    </>
  );
}
