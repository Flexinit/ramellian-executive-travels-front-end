import { describe, it, expect } from 'vitest';
import { notificationLink, notificationText } from './notifications';
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
