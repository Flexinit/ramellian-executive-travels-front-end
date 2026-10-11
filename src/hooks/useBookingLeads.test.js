import { describe, it, expect } from 'vitest';
import { bookingLeadsFor } from './useBookingLeads';

const item = (vehicleId, extra = {}) => ({
  vehicleId,
  startTime: '2026-10-01T09:00:00Z',
  endTime: '2026-10-04T09:00:00Z',
  ...extra,
});

describe('bookingLeadsFor', () => {
  it('builds one lead per item, with a phone contact', () => {
    const leads = bookingLeadsFor([item('a'), item('b')], { kind: 'phone', value: '0712345678' });
    expect(leads).toEqual([
      { phoneNumber: '0712345678', vehicleId: 'a', startTime: item('a').startTime, endTime: item('a').endTime, notes: undefined },
      { phoneNumber: '0712345678', vehicleId: 'b', startTime: item('b').startTime, endTime: item('b').endTime, notes: undefined },
    ]);
  });

  it('uses email instead of a phone number when that is the contact kind', () => {
    const [lead] = bookingLeadsFor([item('a')], { kind: 'email', value: 'me@example.com' });
    expect(lead).toMatchObject({ email: 'me@example.com' });
    expect(lead).not.toHaveProperty('phoneNumber');
  });

  it('carries the renter notes through, when there are any', () => {
    const [lead] = bookingLeadsFor([item('a', { renterNotes: 'Pickup at 9am' })], { kind: 'phone', value: '0712345678' });
    expect(lead.notes).toBe('Pickup at 9am');
  });

  it('is empty without a contact', () => {
    expect(bookingLeadsFor([item('a')], null)).toEqual([]);
  });
});
