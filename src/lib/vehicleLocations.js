/**
 * Helpers for browsing the available vehicles by where they are and what they cost.
 * `location` is free text on a vehicle ("Roysambu division", "Nairobi CBD"), so two spellings that
 * differ only in case or spacing count as the same place.
 */

const keyOf = (location) => String(location || '').trim().replace(/\s+/g, ' ').toLowerCase();
const labelOf = (location) => String(location || '').trim().replace(/\s+/g, ' ');

/** Shown for a vehicle that has no location on record. */
export const UNKNOWN_LOCATION = 'Location not given';

/**
 * The places vehicles are available in, most vehicles first (then A–Z).
 * @param {object[]} vehicles
 * @returns {Array<{ name: string, count: number }>}
 */
export function locationFacets(vehicles = []) {
  const byKey = new Map();
  for (const v of vehicles) {
    const key = keyOf(v?.location);
    if (!key) continue;
    const entry = byKey.get(key) || { name: labelOf(v.location), count: 0 };
    entry.count += 1;
    byKey.set(key, entry);
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * The vehicles split into one group per location, the busiest location first.
 * @param {object[]} vehicles
 * @returns {Array<{ name: string, vehicles: object[] }>}
 */
export function groupByLocation(vehicles = []) {
  const byKey = new Map();
  for (const v of vehicles) {
    const key = keyOf(v?.location) || '\u0000none';
    const group = byKey.get(key) || { name: labelOf(v?.location) || UNKNOWN_LOCATION, vehicles: [] };
    group.vehicles.push(v);
    byKey.set(key, group);
  }
  return [...byKey.values()].sort((a, b) => b.vehicles.length - a.vehicles.length || a.name.localeCompare(b.name));
}

/** Whether `location` is the place the `selected` filter names (same spelling rules as above). */
export function isSameLocation(location, selected) {
  return !!keyOf(selected) && keyOf(location) === keyOf(selected);
}

/**
 * The slider's range for the daily price: from 0 up to the dearest vehicle, rounded up so the
 * dearest one is always inside it (at least KES 10,000, so the slider is never a stub).
 * @param {object[]} vehicles
 * @returns {{ min: number, max: number, step: number }}
 */
export function priceBounds(vehicles = []) {
  const step = 500;
  const top = Math.max(0, ...vehicles.map((v) => Number(v?.pricePerDay ?? v?.dailyPrice ?? 0)).filter(Number.isFinite));
  const max = Math.max(10_000, Math.ceil(top / 5_000) * 5_000);
  return { min: 0, max, step };
}
