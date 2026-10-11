import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './cartStore';

const store = () => useCartStore.getState();
const item = (vehicleId, extra = {}) => ({
  vehicleId,
  startTime: '2026-10-01T09:00:00Z',
  endTime: '2026-10-04T09:00:00Z',
  bookingMode: 'CHAUFFEURED',
  vehicle: { id: vehicleId, model: `Car ${vehicleId}`, dailyPrice: 1000 },
  ...extra,
});

describe('cartStore', () => {
  beforeEach(() => useCartStore.setState({ items: [], contact: null }));

  it('starts empty with no contact', () => {
    expect(store().items).toEqual([]);
    expect(store().contact).toBeNull();
  });

  it('adds several vehicles, each with its own dates', () => {
    expect(store().addItem(item('a'))).toBe('added');
    expect(store().addItem(item('b', { endTime: '2026-10-02T09:00:00Z' }))).toBe('added');
    expect(store().items.map((i) => i.vehicleId)).toEqual(['a', 'b']);
    expect(store().items[1].endTime).toBe('2026-10-02T09:00:00Z');
  });

  it('replaces a vehicle that is added again instead of duplicating it', () => {
    store().addItem(item('a'));
    expect(store().addItem(item('a', { bookingMode: 'SELF_DRIVE' }))).toBe('updated');
    expect(store().items).toHaveLength(1);
    expect(store().items[0].bookingMode).toBe('SELF_DRIVE');
  });

  it('keeps the booking id when an already-started vehicle is re-added unchanged (e.g. just revisiting its page)', () => {
    store().addItem(item('a'));
    store().setBookingId('a', 'bk-1');
    store().addItem(item('a'));
    expect(store().items[0].bookingId).toBe('bk-1');
  });

  it('drops the booking id when an already-started vehicle is re-added with different dates — a new booking, not an edit of the old one', () => {
    store().addItem(item('a'));
    store().setBookingId('a', 'bk-1');
    expect(store().addItem(item('a', { endTime: '2026-10-05T09:00:00Z' }))).toBe('updated');
    expect(store().items[0].bookingId).toBeUndefined();
    expect(store().items[0].endTime).toBe('2026-10-05T09:00:00Z');
  });

  it('drops the booking id when the mode changes too, even with the same dates', () => {
    store().addItem(item('a'));
    store().setBookingId('a', 'bk-1');
    store().addItem(item('a', { bookingMode: 'SELF_DRIVE' }));
    expect(store().items[0].bookingId).toBeUndefined();
  });

  it('removes a vehicle', () => {
    store().addItem(item('a'));
    store().addItem(item('b'));
    store().removeItem('a');
    expect(store().items.map((i) => i.vehicleId)).toEqual(['b']);
  });

  it('remembers the booking created for a vehicle', () => {
    store().addItem(item('a'));
    store().addItem(item('b'));
    store().setBookingId('b', 'bk-2');
    expect(store().items.find((i) => i.vehicleId === 'b').bookingId).toBe('bk-2');
    expect(store().items.find((i) => i.vehicleId === 'a').bookingId).toBeUndefined();
  });

  it('drops a completed booking and keeps the contact until the last one is done', () => {
    store().setContact({ kind: 'email', value: 'me@example.com' });
    store().addItem(item('a', { bookingId: 'bk-1' }));
    store().addItem(item('b', { bookingId: 'bk-2' }));

    store().completeBooking('bk-1');
    expect(store().items.map((i) => i.vehicleId)).toEqual(['b']);
    expect(store().contact).toEqual({ kind: 'email', value: 'me@example.com' });

    store().completeBooking('bk-2');
    expect(store().items).toEqual([]);
    expect(store().contact).toBeNull();
  });

  it('ignores a booking id that is not in the selection', () => {
    store().setContact({ kind: 'phone', value: '0712345678' });
    store().addItem(item('a', { bookingId: 'bk-1' }));
    store().completeBooking('other');
    expect(store().items).toHaveLength(1);
    expect(store().contact).not.toBeNull();
  });

  it('clear empties the selection and the contact', () => {
    store().setContact({ kind: 'phone', value: '0712345678' });
    store().addItem(item('a'));
    store().clear();
    expect(store().items).toEqual([]);
    expect(store().contact).toBeNull();
  });
});
