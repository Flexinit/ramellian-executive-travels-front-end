import { describe, it, expect, beforeEach } from 'vitest';
import { useBookingStore } from './bookingStore';

const getStore = () => useBookingStore.getState();

describe('bookingStore', () => {
  beforeEach(() => {
    useBookingStore.getState().clearDraft();
  });

  it('starts with a fully empty draft', () => {
    const { draft } = getStore();
    expect(draft.vehicleId).toBeNull();
    expect(draft.startTime).toBeNull();
    expect(draft.endTime).toBeNull();
    expect(draft.bookingMode).toBeNull();
    expect(draft.tripType).toBeNull();
    expect(draft.renterNotes).toBe('');
  });

  it('setDraft merges partial updates', () => {
    getStore().setDraft({ vehicleId: 'v1', bookingMode: 'CHAUFFEURED' });
    const { draft } = getStore();
    expect(draft.vehicleId).toBe('v1');
    expect(draft.bookingMode).toBe('CHAUFFEURED');
    // Other fields remain at initial values
    expect(draft.startTime).toBeNull();
  });

  it('setDraft does not overwrite fields not included in the partial', () => {
    getStore().setDraft({ vehicleId: 'v1' });
    getStore().setDraft({ startTime: '2026-10-01T09:00:00Z' });
    expect(getStore().draft.vehicleId).toBe('v1');
    expect(getStore().draft.startTime).toBe('2026-10-01T09:00:00Z');
  });

  it('setDraft stores renterNotes', () => {
    getStore().setDraft({ renterNotes: 'Please arrive early.' });
    expect(getStore().draft.renterNotes).toBe('Please arrive early.');
  });

  it('clearDraft resets all fields to initial values', () => {
    getStore().setDraft({
      vehicleId: 'v1',
      startTime: '2026-10-01T09:00:00Z',
      endTime: '2026-10-04T09:00:00Z',
      bookingMode: 'SELF_DRIVE',
      tripType: 'SAFARI',
      renterNotes: 'Some notes',
    });
    getStore().clearDraft();
    const { draft } = getStore();
    expect(draft.vehicleId).toBeNull();
    expect(draft.startTime).toBeNull();
    expect(draft.endTime).toBeNull();
    expect(draft.bookingMode).toBeNull();
    expect(draft.tripType).toBeNull();
    expect(draft.renterNotes).toBe('');
  });

  it('clearDraft returns an independent copy (mutations do not affect default)', () => {
    getStore().setDraft({ vehicleId: 'v1' });
    getStore().clearDraft();
    getStore().setDraft({ vehicleId: 'v2' });
    // A second clear should still reset fully
    getStore().clearDraft();
    expect(getStore().draft.vehicleId).toBeNull();
  });
});
