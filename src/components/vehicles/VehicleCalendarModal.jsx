import React from 'react';
import Modal from '../ui/Modal';
import BookingCalendar from './BookingCalendar';

/**
 * One vehicle's booking calendar, in a modal — opened from its `OwnerVehicleCard` ("View Calendar").
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {string} vehicleModel — shown in the modal title
 * @param {string} [vehicleColor] — this vehicle's own color, tints every day's marker (see `BookingCalendar`)
 * @param {Array<{id: string, start: Date, end: Date, status: string}>} periods — see `lib/vehicleBookings.js`'s `bookedPeriods`
 */
export default function VehicleCalendarModal({ isOpen, onClose, vehicleModel, vehicleColor, periods }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${vehicleModel} — Booking Calendar`}>
      <BookingCalendar periods={periods} vehicleColor={vehicleColor} />
    </Modal>
  );
}
