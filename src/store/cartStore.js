import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DRAFT_PREFIX } from '../lib/formDraft';

/**
 * @typedef {{
 *   vehicleId: string,
 *   startTime: string,
 *   endTime: string,
 *   bookingMode: 'SELF_DRIVE'|'CHAUFFEURED',
 *   tripType?: string|null,
 *   renterNotes?: string,
 *   pickupLocation?: string,
 *   dropoffLocation?: string,
 *   deliveryRequested?: boolean,
 *   vehicle: object,
 *   bookingId?: string,
 *   contractAccepted?: boolean,
 *   signed?: boolean,
 * }} CartItem — `vehicle` is a small snapshot (see lib/cart.js `vehicleSnapshot`); `bookingId` is set once
 *   the backend has created the booking for this vehicle; `contractAccepted`/`signed` track that vehicle's
 *   own progress through a multi-vehicle (grouped) checkout — see `groupId` below.
 * @typedef {{ kind: 'phone'|'email', value: string }} CartContact
 */

/**
 * The renter's selection: every vehicle they've added, with its own dates and mode, plus how to reach them
 * before they have an account. It needs no login, and it is kept in localStorage so it survives the whole
 * sign-up → verify email → log in journey (the login token itself lives only in memory, so even a reload
 * signs the person out). It is emptied as each booking (or, for a group, the whole group) is completed.
 *
 * A single vehicle is booked and paid for exactly as before: `POST /bookings/create`, its own Pesapal
 * checkout. Two or more vehicles are booked together instead (`POST /bookings/create-batch`, one combined
 * Pesapal checkout — `docs/backend-requests.md` item 1, added by the backend 2026-09-27): `groupId` is set
 * once that batch is created, and cleared again once the group is done. Each vehicle's contract is still its
 * own (a different owner's terms), so `contractAccepted`/`signed` are tracked per item — see
 * `useStartNextBooking`/`useAcceptContract`/`useSignContract` for how the walk through a group is driven.
 */
const useCartStore = create(
  persist(
    (set, get) => ({
      /** @type {CartItem[]} */
      items: [],
      /** @type {CartContact|null} */
      contact: null,
      /** @type {string|null} */
      groupId: null,

      /**
       * Adds a vehicle, or replaces its earlier entry (one entry per vehicle). If that earlier entry
       * already has a real `bookingId` (created on the backend) and the trip being added is for
       * different dates or mode, the id is dropped rather than carried over — this is a genuinely new
       * booking for the same vehicle, not an edit of the old one, which already exists independently
       * (see My Bookings) and doesn't need the cart to keep pointing at it. An unchanged trip (same
       * dates and mode — e.g. just re-visiting the vehicle's page) keeps the id, since nothing about it
       * actually needs re-booking.
       * @param {CartItem} item
       * @returns {'added'|'updated'}
       */
      addItem: (item) => {
        const existing = get().items.find((i) => i.vehicleId === item.vehicleId);
        const sameTrip =
          existing &&
          existing.startTime === item.startTime &&
          existing.endTime === item.endTime &&
          existing.bookingMode === item.bookingMode &&
          !!existing.deliveryRequested === !!item.deliveryRequested;
        set((state) => ({
          items: existing
            ? state.items.map((i) => (i.vehicleId === item.vehicleId ? { ...item, bookingId: sameTrip ? i.bookingId : undefined } : i))
            : [...state.items, item],
        }));
        return existing ? 'updated' : 'added';
      },

      /** @param {string} vehicleId */
      removeItem: (vehicleId) => set((state) => ({ items: state.items.filter((i) => i.vehicleId !== vehicleId) })),

      /** Merges partial fields into one item, keyed by vehicleId (bookingId, contractAccepted, signed…). */
      updateItem: (vehicleId, partial) =>
        set((state) => ({ items: state.items.map((i) => (i.vehicleId === vehicleId ? { ...i, ...partial } : i)) })),

      /** Remembers the booking the backend created for a vehicle in the selection. */
      setBookingId: (vehicleId, bookingId) =>
        set((state) => ({ items: state.items.map((i) => (i.vehicleId === vehicleId ? { ...i, bookingId } : i)) })),

      /** @param {string|null} groupId */
      setGroupId: (groupId) => set({ groupId }),

      /** A single (non-grouped) booking has been paid and signed: it leaves the selection. */
      completeBooking: (bookingId) =>
        set((state) => {
          const items = state.items.filter((i) => i.bookingId !== bookingId);
          if (items.length === state.items.length) return state;
          return { items, contact: items.length ? state.contact : null, groupId: items.length ? state.groupId : null };
        }),

      /** A grouped checkout has been paid once and every vehicle in it signed: the whole selection clears at once. */
      completeGroup: () => set({ items: [], contact: null, groupId: null }),

      /** @param {CartContact|null} contact */
      setContact: (contact) => set({ contact }),

      clear: () => set({ items: [], contact: null, groupId: null }),
    }),
    {
      name: `${DRAFT_PREFIX}cart`,
      partialize: (state) => ({ items: state.items, contact: state.contact, groupId: state.groupId }),
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

/** @returns {number} how many vehicles are in the selection (for the top bar) */
export const useCartCount = () => useCartStore((s) => s.items.length);

export { useCartStore };
