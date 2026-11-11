import { describe, it, expect } from 'vitest';
import { notificationActionLabel, notificationLink, notificationText } from './notifications';
import { PHONE_REMOVED_TEXT } from './contactGuard';

describe('notificationLink', () => {
  const booking = (type) => ({ type, referenceType: 'BOOKING', referenceId: 'b1' });

  it('sends an owner to the owner booking page and a renter to the renter one', () => {
    expect(notificationLink(booking('NEW_BOOKING'), { isOwner: true, isRenter: false })).toBe('/owner/bookings/b1');
    expect(notificationLink(booking('BOOKING_CONFIRMED'), { isOwner: false, isRenter: true })).toBe('/dashboard/bookings/b1');
  });

  it('for an account that is both, goes by what the notification says happened', () => {
    const both = { isOwner: true, isRenter: true };
    expect(notificationLink(booking('NEW_BOOKING_REQUEST'), both)).toBe('/owner/bookings/b1');
    expect(notificationLink(booking('BOOKING_CONFIRMED'), both)).toBe('/dashboard/bookings/b1');
  });

  it('opens Messages for a chat notification, and nowhere for something it does not know', () => {
    expect(notificationLink({ referenceType: 'CHAT_MESSAGE', referenceId: 'm1' })).toBe('/messages');
    expect(notificationLink({ referenceType: 'MYSTERY', referenceId: 'x' })).toBeNull();
    expect(notificationLink({})).toBeNull();
    expect(notificationLink({ referenceType: 'BOOKING' })).toBeNull(); // no id to open
  });
});

describe('notificationText', () => {
  it('removes phone numbers from what a notification says', () => {
    const { title, message } = notificationText({ title: 'New message', message: 'Ann: call me on 0712345678' });
    expect(title).toBe('New message');
    expect(message).toBe(`Ann: call me on ${PHONE_REMOVED_TEXT}`);
  });

  it('copes with missing text', () => {
    expect(notificationText({})).toEqual({ title: '', message: '' });
  });
});

describe('contract notifications (the owner is asked to sign)', () => {
  it('open the contract signing page, with a Sign Contract button', () => {
    const n = { type: 'CONTRACT_SIGNATURE_REQUIRED', referenceType: 'CONTRACT', referenceId: 'c-1' };
    expect(notificationLink(n, { isOwner: true })).toBe('/contracts/c-1/sign');
    expect(notificationActionLabel(n, { isOwner: true })).toBe('Sign Contract');
  });

  it('open it too when the sign request refers to the booking, by its type or its words', () => {
    const both = { isOwner: true, isRenter: true };
    const byType = { type: 'RENTER_SIGNED_CONTRACT', referenceType: 'BOOKING', referenceId: 'b1' };
    const byWords = { type: 'BOOKING_UPDATE', title: 'Contract', message: 'The renter has signed. Please sign the contract too.', referenceType: 'BOOKING', referenceId: 'b1' };
    for (const n of [byType, byWords]) {
      expect(notificationLink(n, both)).toBe('/contracts/b1/sign');
      expect(notificationActionLabel(n, both)).toBe('Sign Contract');
    }
  });

  it('leave a booking notification that only says something was signed as a booking one', () => {
    const n = { type: 'BOOKING_CONFIRMED', message: 'Your contract was signed.', referenceType: 'BOOKING', referenceId: 'b1' };
    expect(notificationLink(n, { isRenter: true })).toBe('/dashboard/bookings/b1');
  });
});
