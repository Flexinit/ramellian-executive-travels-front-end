import React from 'react';
import { TriangleAlert } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * Shown once, right after a booking is created, when the backend's own `BookingResponse.warnings` says
 * something still needs attention before pickup (most often: documents aren't approved yet) — confirmed
 * against the live OpenAPI spec 2026-10-06. Unlike `DocumentGateModal`, this never blocks the booking from
 * being made or paid for; it's the "both at once" middle ground: checkout stays fast, and the renter still
 * gets a clear, hard-to-miss notice (not just a toast that can be missed or auto-dismissed) that they still
 * need to take care of this before they can actually collect the vehicle — see `canRecordPickup`/Record
 * Pickup, which is the real enforcement point.
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {string[]} warnings
 */
export default function BookingWarningsModal({ isOpen, onClose, warnings = [] }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Before You Pick Up" size="sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-full bg-amber-500/10 flex items-center justify-center">
            <TriangleAlert size={18} className="text-amber-400" aria-hidden="true" />
          </div>
          <p className="text-sm text-brand-grey leading-relaxed">
            Your booking is confirmed, but there&apos;s still something to take care of before you can
            collect the vehicle:
          </p>
        </div>

        <ul className="flex flex-col gap-1.5 text-sm text-brand-white pl-1">
          {warnings.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0 mt-2" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button to="/dashboard/documents" onClick={onClose}>
            Upload Documents Now
          </Button>
          <Button onClick={onClose}>I&apos;ll Do It Later</Button>
        </div>
      </div>
    </Modal>
  );
}
