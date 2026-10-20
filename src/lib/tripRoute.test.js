import { describe, it, expect } from 'vitest';
import { notesWithRoute, withoutRoute, routeFromBooking, routeProblem } from './tripRoute';
import { contractValues } from './contractFields';

describe('trip route', () => {
  it('goes first in the notes, and reads back out of them', () => {
    const notes = notesWithRoute('Nairobi', 'Diani Beach', 'Please bring a child seat');
    expect(notes).toBe('Trip: from Nairobi to Diani Beach. Please bring a child seat');
    expect(withoutRoute(notes)).toBe('Please bring a child seat');
    expect(routeFromBooking({ renterNotes: notes })).toEqual({ origin: 'Nairobi', destination: 'Diani Beach' });
  });

  it("prefers the booking's own fields once the backend stores them", () => {
    expect(routeFromBooking({ tripOrigin: 'Kisumu', tripDestination: 'Nakuru', renterNotes: 'Trip: from A to B.' })).toEqual({ origin: 'Kisumu', destination: 'Nakuru' });
  });

  it('is required: both ends', () => {
    expect(routeProblem('', 'Diani')).toMatch(/travelling from/i);
    expect(routeProblem('Nairobi', ' ')).toMatch(/travelling to/i);
    expect(routeProblem('Nairobi', 'Diani')).toBeNull();
  });

  it('is part of the contract, without repeating it in the renter notes', () => {
    const v = contractValues({ booking: { renterNotes: 'Trip: from Nairobi to Diani Beach. Child seat' } });
    expect(v).toMatchObject({ trip_origin: 'Nairobi', trip_destination: 'Diani Beach', renter_notes: 'Child seat' });
  });
});
