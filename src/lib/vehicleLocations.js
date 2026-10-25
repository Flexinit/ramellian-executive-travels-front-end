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

// Words in a typed place that say nothing about which area it is.
const PLACE_FILLER = new Set(['kenya', 'county', 'road', 'rd', 'street', 'st', 'avenue', 'ave', 'drive', 'the', 'and', 'near', 'off', 'opposite', 'estate', 'centre', 'center', 'mall', 'building', 'house', 'terminal']);

/**
 * The cars near a place someone typed in the home search ("JKIA Terminal 1", "Eastleigh, Nairobi", or what "use my
 * location" filled in) — a preference, not a strict filter (the backend's `location` filter only matches when the
 * whole text appears in a car's base location, so a real address found nothing). A car counts as near when its
 * location shares a meaningful word with the place: "Eastleigh, Nairobi" finds the Eastleigh and the Nairobi cars,
 * "Roysambu" finds "Roysambu division". When nothing matches, every car is returned and `matched` is false, so the
 * page can say so rather than show nothing.
 *
 * @param {object[]} vehicles
 * @param {string} place
 * @returns {{ vehicles: object[], matched: boolean }}
 */
export function vehiclesNear(vehicles = [], place = '') {
  const words = keyOf(place)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !PLACE_FILLER.has(w) && !/^\d+$/.test(w));
  if (words.length === 0) return { vehicles, matched: false };
  const near = vehicles.filter((v) => {
    const loc = keyOf(v?.location);
    return loc && words.some((w) => loc.includes(w) || w.includes(loc));
  });
  return near.length > 0 ? { vehicles: near, matched: true } : { vehicles, matched: false };
}
