import React, { useEffect, useRef } from 'react';
import { Printer } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Receipt from './Receipt';

/**
 * Previews a receipt, with a "Print / Save as PDF" button for the actual download — there's no PDF-generation
 * library in this project (`window.print()` is the same technique `ReportTable`'s own Print button already
 * uses for a downloadable copy of a report), so "download" here means the browser's native print dialog,
 * where saving as PDF is the standard option. Printing isn't scoped to just the receipt (this app has no
 * existing mechanism for that — `ReportTable`'s Print button doesn't isolate its own output either), so the
 * surrounding page may print alongside it; a real print stylesheet is future work, not attempted here.
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {object} booking @param {object} [vehicle] @param {object} receipt — see Receipt.jsx
 * @param {boolean} [autoPrint] — opens straight into the print dialog (the "Download" action in
 *   ReceiptActions) rather than waiting for the person to click the button themselves (the "Preview" action)
 */
export default function ReceiptModal({ isOpen, onClose, booking, vehicle, receipt, autoPrint = false }) {
  const printedRef = useRef(false);

  useEffect(() => {
    if (isOpen && autoPrint && !printedRef.current) {
      printedRef.current = true;
      // A tick so the modal's own content is actually painted before the print dialog takes over.
      const timer = setTimeout(() => window.print(), 50);
      return () => clearTimeout(timer);
    }
    if (!isOpen) printedRef.current = false;
    return undefined;
  }, [isOpen, autoPrint]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receipt" size="sm">
      <div className="flex flex-col gap-5">
        <Receipt booking={booking} vehicle={vehicle} receipt={receipt} />
        <Button onClick={() => window.print()} className="self-start print:hidden">
          <Printer size={15} aria-hidden="true" />
          Print / Save as PDF
        </Button>
      </div>
    </Modal>
  );
}
