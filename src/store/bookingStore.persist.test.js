// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useBookingStore } from './bookingStore';

const KEY = 'ret.draft.booking';

beforeEach(() => {
  useBookingStore.getState().clearDraft();
  localStorage.clear();
});

describe('bookingStore persistence', () => {
  it('writes the in-progress booking to localStorage', () => {
    useBookingStore.getState().setDraft({ vehicleId: 'v1', bookingMode: 'CHAUFFEURED', renterNotes: 'Please arrive early' });

    const stored = JSON.parse(localStorage.getItem(KEY));
    expect(stored.state.draft).toMatchObject({ vehicleId: 'v1', bookingMode: 'CHAUFFEURED', renterNotes: 'Please arrive early' });
  });

  it('brings the booking back after a reload (rehydration)', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ state: { draft: { vehicleId: 'v9', startTime: null, endTime: null, bookingMode: 'SELF_DRIVE', tripType: null, renterNotes: 'Roof rack' } }, version: 0 })
    );

    await useBookingStore.persist.rehydrate();

    expect(useBookingStore.getState().draft).toMatchObject({ vehicleId: 'v9', bookingMode: 'SELF_DRIVE', renterNotes: 'Roof rack' });
  });

  it('is emptied by clearDraft once a booking is made', () => {
    useBookingStore.getState().setDraft({ vehicleId: 'v1' });
    useBookingStore.getState().clearDraft();

    expect(JSON.parse(localStorage.getItem(KEY)).state.draft.vehicleId).toBeNull();
  });

  it('stores only the draft, not the actions', () => {
    useBookingStore.getState().setDraft({ vehicleId: 'v1' });
    expect(Object.keys(JSON.parse(localStorage.getItem(KEY)).state)).toEqual(['draft']);
  });
});
