import { ratingOrDefault } from './ratings';

/**
 * When a vehicle went live, as a timestamp (0 if unknown). `VehicleResponse` has no "created" date, so this is
 * `reviewedAt` — when an admin approved it — and only approved vehicles are listed publicly, so that is when
 * renters could first see it. docs/backend-requests.md item 35 asks for a real `createdAt`.
 */
export function listedAt(vehicle) {
  const t = Date.parse(vehicle?.reviewedAt ?? '');
  return Number.isFinite(t) ? t : 0;
}

/** How long a listing counts as "New" (its badge). */
export const NEW_LISTING_DAYS = 7;

/** Whether `vehicle` went live within the last `NEW_LISTING_DAYS` days. */
export function isNewListing(vehicle, now = Date.now()) {
  const t = listedAt(vehicle);
  return t > 0 && now - t >= 0 && now - t < NEW_LISTING_DAYS * 24 * 60 * 60 * 1000;
}

/** Newest listing first ("Newest" sort, the home page's "Just added" row); unknown dates last. Stable. */
export function newestOrder(vehicles = []) {
  return vehicles
    .map((vehicle, index) => ({ vehicle, index }))
    .sort((a, b) => listedAt(b.vehicle) - listedAt(a.vehicle) || a.index - b.index)
    .map(({ vehicle }) => vehicle);
}

/**
 * The "Recommended" order for a list of vehicles. The backend has no real recommended order — tested live
 * 2026-10-08, `GET /vehicles` with `sort=recommended` (or none) comes back in internal-id order, which is
 * effectively random — so the portal works one out (docs/backend-requests.md item 35 asks the backend to own it):
 *  1. free for the searched dates before ones already booked (`isBooked`);
 *  2. higher rating first — the same figure the card shows (`ratingOrDefault`);
 *  3. a listing with a photo before one without;
 *  4. the newer listing first (`listedAt`);
 *  5. otherwise the order the backend sent (the sort is stable).
 * Returns a new array; the input is left alone.
 * @param {object[]} vehicles
 */
export function recommendedOrder(vehicles = []) {
  const hasPhoto = (v) => (Array.isArray(v.photos) && v.photos.length > 0 ? 1 : 0);
  return vehicles
    .map((vehicle, index) => ({ vehicle, index }))
    .sort((a, b) =>
      Number(!!a.vehicle.isBooked) - Number(!!b.vehicle.isBooked) ||
      ratingOrDefault(b.vehicle.rating) - ratingOrDefault(a.vehicle.rating) ||
      hasPhoto(b.vehicle) - hasPhoto(a.vehicle) ||
      listedAt(b.vehicle) - listedAt(a.vehicle) ||
      a.index - b.index
    )
    .map(({ vehicle }) => vehicle);
}

/**
 * The portal's own sort values — worked out here rather than by the backend. "newest" in particular must not
 * be sent: `GET /vehicles` refuses any `sort` outside its own list with a 400 (tested live 2026-10-08).
 */
export const CLIENT_SORTS = { NEWEST: 'newest' };

/** Whether `sort` (the URL's `sort` param) means the default, "Recommended" order. */
export function isRecommendedSort(sort) {
  return !sort || sort === 'recommended';
}
