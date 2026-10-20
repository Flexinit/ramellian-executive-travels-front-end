/**
 * The trip's route — where it starts (`tripOrigin`) and where it's going (`tripDestination`), both required when
 * booking (product rule 2026-10-17) and part of the contract.
 *
 * The backend has no fields for them yet (docs/backend-requests.md item 44): they're sent as `tripOrigin` /
 * `tripDestination` (ignored until it stores them) and also written at the start of the booking's notes —
 * "Trip: from Nairobi to Diani Beach." — so the route reaches the owner and the contract today. `routeFromBooking`
 * reads it back from whichever is there.
 */

const PREFIX = /^Trip: from (.+?) to (.+?)\.(?:\s+|$)/;

/** The notes as sent: the route first, then whatever the renter wrote. */
export function notesWithRoute(origin, destination, notes = '') {
  const o = String(origin || '').trim();
  const d = String(destination || '').trim();
  const rest = withoutRoute(notes);
  if (!o || !d) return rest;
  return `Trip: from ${o} to ${d}.${rest ? ` ${rest}` : ''}`;
}

/** The renter's own notes, without the route line. */
export function withoutRoute(notes = '') {
  return String(notes || '').replace(PREFIX, '').trim();
}

/** `{ origin, destination }` for a booking: its own fields if the backend has them, else from the notes. */
export function routeFromBooking(booking = {}) {
  if (booking.tripOrigin || booking.tripDestination) {
    return { origin: booking.tripOrigin || '', destination: booking.tripDestination || '' };
  }
  const m = String(booking.renterNotes || '').match(PREFIX);
  return m ? { origin: m[1], destination: m[2] } : { origin: '', destination: '' };
}

/** Why the route can't be booked yet, or null. */
export function routeProblem(origin, destination) {
  if (!String(origin || '').trim()) return 'Please enter where your trip starts (Travelling from).';
  if (!String(destination || '').trim()) return 'Please enter where you are going (Travelling to).';
  return null;
}
