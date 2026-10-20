import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DRAFT_PREFIX } from '../lib/formDraft';

/**
 * @typedef {{
 *   vehicleId: string|null,
 *   startTime: string|null,
 *   endTime: string|null,
 *   bookingMode: 'SELF_DRIVE'|'CHAUFFEURED'|null,
 *   tripType: string|null,
 *   renterNotes: string,
 *   pickupLocation: string,
 *   dropoffLocation: string,
 *   deliveryRequested: boolean,
 * }} BookingDraft
 */

/** @type {BookingDraft} */
const INITIAL_DRAFT = {
  vehicleId:       null,
  startTime:       null,
  endTime:         null,
  bookingMode:     null,
  tripType:        null,
  renterNotes:     '',
  pickupLocation:  '',
  dropoffLocation: '',
  deliveryRequested: false,
  passengerCount:  null,
  tripOrigin:      '',
  tripDestination: '',
};

/**
 * The in-progress booking (dates, mode, trip type, notes) is kept in
 * localStorage so a page reload doesn't send the renter back to the start of
 * the wizard. Only `draft` is stored; it survives logout and login like the
 * other form drafts (lib/formDraft.js) and is emptied by `clearDraft` once a
 * booking is made.
 */
const useBookingStore = create(
  persist(
    (set) => ({
  /** @type {BookingDraft} */
  draft: { ...INITIAL_DRAFT },

  /**
   * Merge partial updates into the draft.
   * @param {Partial<BookingDraft>} partial
   */
  setDraft: (partial) =>
    set((state) => ({ draft: { ...state.draft, ...partial } })),

  /**
   * Reset the draft back to its empty state.
   */
  clearDraft: () => set({ draft: { ...INITIAL_DRAFT } }),

  /**
   * What the renter last searched for on Browse Vehicles (dates, mode, pickup/return place) — mirrored from
   * its URL by VehiclesPage, so a vehicle opened from the results starts its booking form with the same
   * choices instead of asking for them again (AddToBookingPanel). Kept in memory only, not localStorage: a
   * search from a previous visit shouldn't quietly fill in a form days later.
   * @type {{ startTime?: string, endTime?: string, bookingMode?: string, pickupLocation?: string, dropoffLocation?: string }}
   */
  search: {},
  setSearch: (search) => set({ search }),
    }),
    {
      name: `${DRAFT_PREFIX}booking`,
      partialize: (state) => ({ draft: state.draft }),
      // localStorage can be blocked; a throwing getter would break the whole store, so fall back to memory.
      storage: createJSONStorage(() => {
        try {
          return window.localStorage;
        } catch {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
      }),
    }
  )
);

export { useBookingStore };
