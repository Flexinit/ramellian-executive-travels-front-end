/**
 * Vehicle photos — what the backend does and doesn't give us (confirmed
 * against the live OpenAPI spec and the live server):
 *  - `POST /vehicles/{id}/photos` returns `{ id, fileName, contentType, url }`
 *    where `url` is a server-relative path such as `/uploads/vehicles/<uuid>.png`
 *    (the server renames the file, so the angle we put in the file name is NOT kept).
 *  - `VehicleResponse` has no `photos` field and there is no endpoint to list a
 *    vehicle's photos (`GET /vehicles/{id}/photos` answers 500).
 *  - The photo files themselves need a login token to download (403 without one),
 *    so a plain `<img src>` can't show them — see components/vehicles/AuthImage.
 * So the only place a photo's URL is ever revealed is the upload response. It is
 * remembered here, in this browser, and attached to a vehicle whenever it's
 * fetched. That works for the person who uploaded it, on this browser only; the
 * real fix is for the backend to return `photos` with each vehicle. If it ever
 * does, `normalizeVehicle` (hooks/useVehicles.js) uses those and ignores this cache.
 */

/**
 * The shots a good listing needs, in the order to take them. `tip` says how to
 * frame each one; left/right are defined from standing behind the car, so
 * nobody has to guess which side is which.
 */
export const PHOTO_ANGLES = [
  { key: 'front', label: 'Front', tip: 'Stand a few steps back and centre the whole front — bumper, grille and headlights.' },
  { key: 'back', label: 'Back', tip: 'Same distance from the rear — boot, tail-lights and number plate in frame.' },
  { key: 'left', label: 'Left side', tip: 'The side on your left when you stand behind the car. Show it end to end, all four wheels visible.' },
  { key: 'right', label: 'Right side', tip: 'The side on your right when you stand behind the car. Show it end to end, all four wheels visible.' },
  { key: 'interior', label: 'Interior — front', tip: 'Dashboard, steering wheel and front seats, shot from the back seat.' },
  { key: 'interior-back', label: 'Interior — back seats', tip: 'The rear seats and legroom, shot from the open rear door.' },
];

/** File name a guided photo is uploaded under (its angle), e.g. `front.jpg`. */
export function angleFileName(key, file) {
  const fromName = file.name?.includes('.') ? file.name.split('.').pop() : '';
  const ext = (fromName || file.type?.split('/')[1] || 'jpg').toLowerCase();
  return `${key}.${ext}`;
}

/** The angle key a file was uploaded under (`front.jpg` → `front`), or null for an extra photo. */
export function angleFromFileName(name) {
  const base = String(name || '').replace(/\.[^.]+$/, '');
  return PHOTO_ANGLES.some((a) => a.key === base) ? base : null;
}

/**
 * Where server-relative media lives: the API host, or — when `VITE_API_BASE_URL` is empty because the API is reached
 * through this site itself (Vite's dev proxy, the host Nginx in production) — this site's own origin. Always absolute,
 * so `api.get(url)` in AuthImage doesn't put its `/api/v1` base in front.
 */
export function mediaHost() {
  return String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '') || window.location.origin;
}

/**
 * Turns a server-relative photo path into an absolute URL on the API host. An absolute `/uploads/...` URL saved
 * with some other address (e.g. a sticker photo stored as `http://<backend>:8090/uploads/...`, or under the live
 * domain by a local backend) is moved onto the API host in use too — `mediaHost()`, i.e. this site when the API is
 * reached through it: the file lives on the backend being called, the backend refuses the browser's cross-site
 * requests, and an https page can't load http media.
 */
export function photoSrc(url) {
  if (!url) return url;
  if (/^(blob:|data:)/i.test(url)) return url;
  if (/^https?:/i.test(url)) {
    const { pathname, search } = new URL(url);
    return pathname.startsWith('/uploads/') ? `${mediaHost()}${pathname}${search}` : url;
  }
  return `${mediaHost()}${url.startsWith('/') ? '' : '/'}${url}`;
}

const PHOTOS_KEY = 'ret.vehiclePhotos';
const OWN_IDS_KEY = (userId) => `ret.ownVehicleIds.${userId}`;

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable or full — photos just aren't remembered */
  }
}

/** Remembers a photo the backend just accepted for `vehicleId` (from the upload response). */
export function rememberPhoto(vehicleId, photo, angle = null) {
  if (!vehicleId || !photo?.url) return;
  const all = readJson(PHOTOS_KEY, {});
  const list = (all[vehicleId] || []).filter((p) => p.id !== photo.id);
  list.push({ id: photo.id, url: photo.url, fileName: photo.fileName, angle });
  all[vehicleId] = list;
  writeJson(PHOTOS_KEY, all);
}

/** Remembered photos for a vehicle, guided angles first in shooting order, then extras. */
export function getCachedPhotos(vehicleId) {
  const list = readJson(PHOTOS_KEY, {})[vehicleId] || [];
  const rank = (p) => {
    const i = PHOTO_ANGLES.findIndex((a) => a.key === p.angle);
    return i === -1 ? PHOTO_ANGLES.length : i;
  };
  return [...list].sort((a, b) => rank(a) - rank(b)).map((p) => {
    const label = PHOTO_ANGLES.find((a) => a.key === p.angle)?.label;
    return { id: p.id, url: p.url, alt: label ? `${label} view` : undefined };
  });
}

/**
 * Remembers that this person created `vehicleId`. The public vehicle list only
 * returns *available* vehicles and a new one starts unavailable, so this is how
 * their own not-yet-listed vehicles can still be fetched (by id) and shown.
 */
export function rememberOwnVehicle(userId, vehicleId) {
  if (!userId || !vehicleId) return;
  const ids = readJson(OWN_IDS_KEY(userId), []);
  if (!ids.includes(vehicleId)) writeJson(OWN_IDS_KEY(userId), [...ids, vehicleId]);
}

export function getOwnVehicleIds(userId) {
  return userId ? readJson(OWN_IDS_KEY(userId), []) : [];
}

/** Forgets a remembered photo (once the backend has deleted it), so it stops being listed. */
export function forgetPhoto(vehicleId, photoId) {
  if (!vehicleId || !photoId) return;
  const all = readJson(PHOTOS_KEY, {});
  if (!all[vehicleId]) return;
  all[vehicleId] = all[vehicleId].filter((p) => p.id !== photoId);
  writeJson(PHOTOS_KEY, all);
}

/** The angle a remembered photo was taken for (`front`, `left`…), or null — used to keep a replacement in the same slot. */
export function getPhotoAngle(vehicleId, photoId) {
  const record = (readJson(PHOTOS_KEY, {})[vehicleId] || []).find((p) => p.id === photoId);
  return record?.angle || null;
}
