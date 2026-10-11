import { useMutation } from '@tanstack/react-query';
import { apiPost } from '../lib/api';
import { CONTACT_KINDS } from '../lib/cart';

/**
 * Records a visitor's interest in a vehicle before they have an account — `POST /booking-leads`
 * `{ email?, phoneNumber?, vehicleId, startTime, endTime, notes? }` → `BookingLeadResponse`. Confirmed live
 * as public (201, no auth needed) — added to the backend 2026-09-27, approved by the business the same day
 * (`docs/backend-requests.md` item 4), so it can follow up on a booking that's abandoned after the visitor
 * shares a contact. One lead is sent per vehicle in the selection when the contact is submitted
 * (BookingContactPage) — fire-and-forget: a failure here is never shown to the renter and never blocks
 * checkout, since this is a nice-to-have for the business, not something the renter's own flow depends on.
 */
export function useCreateBookingLead() {
  return useMutation({
    mutationFn: (lead) => apiPost('/booking-leads', lead),
  });
}

/** Builds one `BookingLeadRequest` per cart item, sharing the same contact. */
export function bookingLeadsFor(items, contact) {
  if (!contact) return [];
  const contactField = contact.kind === CONTACT_KINDS.EMAIL ? { email: contact.value } : { phoneNumber: contact.value };
  return items.map((item) => ({
    ...contactField,
    vehicleId: item.vehicleId,
    startTime: item.startTime,
    endTime: item.endTime,
    notes: item.renterNotes || undefined,
  }));
}
