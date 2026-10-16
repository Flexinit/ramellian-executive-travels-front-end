import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiDelete, apiGet, apiPost, apiPut, apiUpload } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { useAuthStore } from '../store/authStore';
import { locationFacets, priceBounds } from '../lib/vehicleLocations';
import { CLIENT_SORTS, isRecommendedSort, newestOrder, recommendedOrder } from '../lib/vehicleRanking';
import {
  angleFromFileName,
  getCachedPhotos,
  angleFileName,
  forgetPhoto,
  getPhotoAngle,
  photoSrc,
  rememberOwnVehicle,
  rememberPhoto,
} from '../lib/vehiclePhotos';

/**
 * Vehicle discovery + management queries — talk directly to the real
 * backend per FRONTEND_INTEGRATION.md §2 and the live OpenAPI spec at
 * VITE_SWAGGER_URL (`/v3/api-docs`), confirmed reachable and checked
 * directly against `VehicleRequest`/`VehicleResponse`.
 *
 * Confirmed mismatches between the backend and the display layer:
 *  - `VehicleResponse` has no `tier` field at all — the Standard/Executive
 *    fleet split baked into the Navbar/Footer/FleetSection/FleetPage is
 *    not backed by any real data today.
 *  - `VehicleResponse` has no `photos` field and there's no endpoint to list a
 *    vehicle's photos — see `normalizeVehicle` and lib/vehiclePhotos.js for how
 *    photos are attached anyway.
 *  - The price field is `pricePerDay`, not `dailyPrice` — `normalizeVehicle`
 *    adds the alias the display components read.
 */

/**
 * Shapes a `VehicleResponse` for the display components:
 *  - `photos` — the vehicle's photos as `{ url, alt? }`. The backend returns none
 *    (see lib/vehiclePhotos.js), so the photos remembered from this browser's
 *    uploads are attached; if the server ever sends `photos`, those win.
 *  - `dailyPrice` — an alias of the backend's `pricePerDay`, which VehicleCard,
 *    PriceDisplay usages etc. read.
 */
export function normalizeVehicle(vehicle) {
  if (!vehicle || typeof vehicle !== 'object') return vehicle;
  const fromServer = Array.isArray(vehicle.photos) ? vehicle.photos : [];
  const raw = fromServer.length ? fromServer : getCachedPhotos(vehicle.id);
  const photos = raw.map((p) => (typeof p === 'string' ? { url: photoSrc(p) } : { ...p, url: photoSrc(p.url) }));
  return { ...vehicle, dailyPrice: vehicle.dailyPrice ?? vehicle.pricePerDay, photos };
}

const normalizeList = (data) => {
  if (Array.isArray(data)) return data.map(normalizeVehicle);
  if (data && Array.isArray(data.content)) return { ...data, content: data.content.map(normalizeVehicle) };
  return data;
};

/** Renter-facing lists must never offer a vehicle that can't be booked. */
const onlyAvailable = (list) => list.filter((v) => v?.available !== false);

const listSelector = (includeUnavailable) => (data) => {
  const normalized = normalizeList(data);
  if (includeUnavailable) return normalized;
  if (Array.isArray(normalized)) return onlyAvailable(normalized);
  if (normalized && Array.isArray(normalized.content)) return { ...normalized, content: onlyAvailable(normalized.content) };
  return normalized;
};

/**
 * Searches vehicles with the renter-friendly filters the backend supports:
 * query, location, minPrice, maxPrice, capacity, fuelType,
 * transmissionType, selfDrive, chauffeured, startTime, endTime, sort.
 *
 * Vehicles marked unavailable are dropped, since this feeds the public search and
 * fleet pages and nobody should be offered a car they can't book. Owner views
 * (`useMyVehicles`) pass `includeUnavailable` so an owner still sees every vehicle.
 *
 * @param {Record<string, string|number|boolean|undefined>} filters
 * @param {{ includeUnavailable?: boolean }} [options]
 */
export function useVehicles(filters = {}, { includeUnavailable = false } = {}) {
  return useQuery({
    queryKey: ['vehicles', filters],
    queryFn: () => apiGet('/vehicles', filters),
    select: listSelector(includeUnavailable),
    // Availability changes minute to minute (an owner switches a car on, a booking lands), so a visit to a
    // list always fetches fresh instead of trusting a copy that may be minutes old — or fetched while the
    // backend was down or empty.
    refetchOnMount: 'always',
  });
}

/**
 * What the search page's filters are built from: the places available vehicles are in (with how
 * many are in each) and the daily-price range they span. Taken from the unfiltered list of
 * available vehicles, so it doesn't shrink as filters are applied.
 * @returns {{ locations: Array<{ name: string, count: number }>, priceBounds: { min: number, max: number, step: number }, isLoading: boolean }}
 */
export function useVehicleFacets() {
  const { data, isLoading } = useVehicles();
  const list = Array.isArray(data) ? data : data?.content || [];
  return { locations: locationFacets(list), priceBounds: priceBounds(list), isLoading };
}

/**
 * The search grid's own list, each vehicle marked `isBooked` rather than dropped — a vehicle someone else
 * already has (a CONFIRMED/ACTIVE booking covering the window) stays visible, just not bookable for it.
 * Reads the backend's own `VehicleResponse.booked` boolean directly (confirmed live: present on both
 * `GET /vehicles` and `GET /vehicles/{id}`, respects `startTime`/`endTime` when given, and — checked
 * against a real PENDING hold — correctly ignores unpaid/pending bookings rather than blocking on them).
 *
 * @param {Record<string, string|number|boolean|undefined>} filters — same shape as `useVehicles`
 */
export function useVehicleAvailability(filters = {}) {
  // "Newest" is the portal's own sort: the backend refuses it (400), so it's never sent.
  const newest = filters.sort === CLIENT_SORTS.NEWEST;
  const apiFilters = { ...filters };
  if (newest) delete apiFilters.sort;
  const query = useVehicles(apiFilters);
  const list = Array.isArray(query.data) ? query.data : query.data?.content || [];
  // "Booked" only means something for the dates being looked at: without dates the backend's flag says the
  // car has a booking *somewhere*, and a "BOOKED" badge then reads as "unavailable" when it may be free on the
  // renter's own dates. So a vehicle is only marked once dates are chosen.
  const hasDates = !!(filters.startTime && filters.endTime);
  const marked = list.map((v) => ({ ...v, isBooked: hasDates && v.booked === true }));
  // "Recommended" (the default) and "Newest" are ordered here — the backend has neither (lib/vehicleRanking.js).
  // Any other sort the renter picks is the backend's, left exactly as it came.
  const vehicles = newest ? newestOrder(marked) : isRecommendedSort(filters.sort) ? recommendedOrder(marked) : marked;

  return {
    vehicles,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    hasDates,
  };
}

/**
 * Whether `vehicleId` is already booked for `startTime`–`endTime` — the same `booked` field as
 * `useVehicleAvailability`, for one vehicle and one exact window (read from the dated list, see below), asked
 * right before it's added to a booking (`AddToBookingPanel`) so a renter is warned up front rather than
 * only finding out from a raw error at checkout.
 */
export function useVehicleWindowBooked(vehicleId, startTime, endTime) {
  const enabled = !!(vehicleId && startTime && endTime);
  const query = useQuery({
    queryKey: ['vehicles', vehicleId, 'window-availability', startTime, endTime],
    // Read from the list (`GET /vehicles?startTime&endTime`), not `GET /vehicles/{id}`: tested live 2026-10-13, the
    // single-vehicle endpoint ignores the dates and says `booked: true` for any window once the vehicle has a booking
    // anywhere (docs/backend-requests.md item 39), while the list answers for exactly the window asked. A vehicle
    // missing from the list (switched off, not approved) isn't reported booked here — the page handles that itself.
    queryFn: () => apiGet('/vehicles', { startTime, endTime }),
    select: (data) => {
      const list = Array.isArray(data) ? data : data?.content || [];
      return list.find((v) => v?.id === vehicleId)?.booked === true;
    },
    enabled,
  });
  return { isBooked: enabled && query.data === true, isLoading: enabled && query.isLoading };
}

/**
 * The signed-in owner's own vehicles — every one of them, whether or not it is available or approved —
 * from `GET /vehicles/me` (the backend's "vehicles owned by the current user"). This replaces the old workaround that
 * pieced the list together from bookings, documents and what this browser remembered.
 * @returns {{ vehicles: object[], isLoading: boolean, isError: boolean, refetch: () => void }}
 */
export function useMyVehicles() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const query = useQuery({
    queryKey: ['vehicles', 'me'],
    queryFn: () => apiGet('/vehicles/me'),
    select: (data) => (Array.isArray(data) ? data.map(normalizeVehicle) : []),
    enabled: isAuthenticated,
    refetchOnMount: 'always',
  });
  return { vehicles: query.data || [], isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}

/**
 * Every vehicle on the platform for an administrator (`GET /vehicles/admin/all`), including ones switched off, and each
 * with its `approvalStatus` (`PENDING`, `APPROVED`, `REJECTED`, or empty for a vehicle added before approval existed).
 * @param {'PENDING'|'APPROVED'|'REJECTED'} [status] — narrows the list on the backend
 */
export function useAdminVehicles(status) {
  return useQuery({
    queryKey: ['vehicles', 'admin', status || 'all'],
    queryFn: () => apiGet('/vehicles/admin/all', status ? { status } : undefined),
    select: (data) => (Array.isArray(data) ? data.map(normalizeVehicle) : []),
    refetchOnMount: 'always',
  });
}

/**
 * Approves or rejects a vehicle listing — `PUT /vehicles/admin/{id}/review` `{ status, notes? }` (an administrator), or, for
 * someone who isn't one, `PUT /vehicles/{id}/review` (the same body; the spec doesn't say who else may use it). Pass
 * `{ vehicle, status: 'APPROVED'|'REJECTED', notes?, asAdmin? }`. The answer must carry the new status, or the review is
 * reported as not kept.
 */
export function useReviewVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ vehicle, status, notes, asAdmin = true }) => {
      const path = asAdmin ? `/vehicles/admin/${vehicle.id}/review` : `/vehicles/${vehicle.id}/review`;
      const updated = await apiPut(path, { status, ...(notes ? { notes } : {}) });
      if (updated?.approvalStatus !== undefined && updated.approvalStatus !== status) {
        const error = new Error("The server answered, but didn't record the decision.");
        error.local = true;
        throw error;
      }
      return updated;
    },
    onSuccess: (updated, { vehicle, status }) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(status === 'APPROVED' ? `${vehicle.model} approved.` : `${vehicle.model} rejected.`);
    },
    onError: (error) => toast.error(error?.local ? error.message : apiErrorMessage(error, "Couldn't save that decision.")),
  });
}

/**
 * The `VehicleRequest` body for a vehicle we already have (what `PUT
 * /vehicles/{id}` expects — it replaces the vehicle, so every field that
 * defines it must be sent again, not just the one being changed).
 */
export function vehicleToRequest(vehicle) {
  const request = {
    model: vehicle.model,
    vin: vehicle.vin,
    registrationNumber: vehicle.registrationNumber,
    location: vehicle.location,
    pricePerDay: vehicle.pricePerDay ?? vehicle.dailyPrice,
    capacity: vehicle.capacity,
    color: vehicle.color,
    fuelType: vehicle.fuelType,
    transmissionType: vehicle.transmissionType,
    selfDrive: !!vehicle.selfDrive,
    chauffeured: !!vehicle.chauffeured,
    tripTypes: vehicle.tripTypes || [],
    // The live backend answers 400 unless all three of these booleans are present (verified with a real
    // account, again after the backend fix), although the spec doesn't mark them required — so they are
    // always sent, `false` if unknown.
    available: !!vehicle.available,
    hasWorkingAC: !!vehicle.hasWorkingAC,
    comprehensiveInsurance: !!vehicle.comprehensiveInsurance,
    // Sent back as they are so a PUT (which replaces the vehicle) never wipes them.
    availableFrom: vehicle.availableFrom,
    availableTo: vehicle.availableTo,
    insuranceVerificationStickerPhoto: vehicle.insuranceVerificationStickerPhoto,
    year: vehicle.year,
    insurer: vehicle.insurer,
    policyNumber: vehicle.policyNumber,
  };
  return Object.fromEntries(Object.entries(request).filter(([, value]) => value !== undefined && value !== null));
}

/** `datetime-local` gives "2026-10-01T09:00"; the backend's `date-time` fields want a full ISO instant. */
function toInstant(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * The `VehicleRequest` body for the add-vehicle form's values. Optional fields
 * that were left blank are omitted rather than sent empty. The form's
 * `availabilityMode` isn't sent: "always" means no window at all, while "dates"
 * sends `availableFrom` / `availableTo` as ISO date-times.
 */
export function buildVehicleRequest(values) {
  const { availabilityMode, ...rest } = values;
  const always = availabilityMode === 'always';
  const request = {
    ...rest,
    availableFrom: always ? undefined : toInstant(values.availableFrom),
    availableTo: always ? undefined : toInstant(values.availableTo),
  };
  return Object.fromEntries(Object.entries(request).filter(([, value]) => value !== undefined && value !== null && value !== ''));
}

/** Applies `fields` to vehicle `id` wherever it sits in a cached list (array or `{ content }`) or detail entry. */
function patchCachedVehicle(data, id, fields) {
  if (Array.isArray(data)) return data.map((v) => (v?.id === id ? { ...v, ...fields } : v));
  if (data && Array.isArray(data.content)) return { ...data, content: data.content.map((v) => (v?.id === id ? { ...v, ...fields } : v)) };
  if (data && data.id === id) return { ...data, ...fields };
  return data;
}

/**
 * One-click availability for a car owner: `PUT /vehicles/{id}` with the
 * vehicle's own details plus the new `available` value, so an owner can pull a
 * vehicle from renters (or put it back) without touching anything else.
 * Pass `{ vehicle, available }`.
 *
 * The switch moves straight away (the cached vehicle is updated before the server
 * answers) and is put back if the request fails. It also checks the server's
 * answer: if the server says 200 but returns the old `available` value, it has
 * ignored the change, so the switch is reverted and the owner is told, rather
 * than being shown a success that didn't happen.
 */
export function useSetVehicleAvailability() {
  const queryClient = useQueryClient();
  const restore = (context) => context?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));

  return useMutation({
    mutationFn: ({ vehicle, available }) => apiPut(`/vehicles/${vehicle.id}`, { ...vehicleToRequest(vehicle), available }),
    onMutate: async ({ vehicle, available }) => {
      await queryClient.cancelQueries({ queryKey: ['vehicles'] });
      const previous = queryClient.getQueriesData({ queryKey: ['vehicles'] });
      queryClient.setQueriesData({ queryKey: ['vehicles'] }, (data) => patchCachedVehicle(data, vehicle.id, { available }));
      return { previous };
    },
    onSuccess: (updated, { vehicle, available }, context) => {
      if (typeof updated?.available === 'boolean' && updated.available !== available) {
        restore(context);
        toast.error(`The server didn't change ${vehicle.model}'s availability. It is still ${updated.available ? 'available' : 'unavailable'}.`);
        return;
      }
      toast.success(
        available ? `${vehicle.model} is available for booking again.` : `${vehicle.model} is now unavailable — renters can't book it.`
      );
    },
    onError: (error, { vehicle }, context) => {
      restore(context);
      toast.error(apiErrorMessage(error, `Couldn't update ${vehicle.model}.`));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

/**
 * Removes a vehicle (`DELETE /vehicles/{id}`). Pass the vehicle. Used from the admin's All Vehicles page.
 */
export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vehicle) => apiDelete(`/vehicles/${vehicle.id}`),
    onSuccess: (data, vehicle) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(`${vehicle.model} was removed.`);
    },
    onError: (error, vehicle) => toast.error(apiErrorMessage(error, `Couldn't remove ${vehicle.model}.`)),
  });
}

/** Fetches a single vehicle's detail (spec, description, photos) by id. */
export function useVehicle(id) {
  return useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => apiGet(`/vehicles/${id}`),
    select: normalizeVehicle,
    enabled: !!id,
  });
}

/**
 * Creates a vehicle (owner/manager/admin only) via
 * `POST /vehicles/create-vehicle`. Matches the confirmed `VehicleRequest`
 * schema exactly: `model`, `vin`, `registrationNumber`, `location`,
 * `pricePerDay`, `capacity`, `color`, `fuelType`, `transmissionType`,
 * `selfDrive`, `chauffeured`, `tripTypes` (array of the backend's own trip
 * type enum — see AddVehiclePage), `available`, `availableFrom`/`availableTo`,
 * `hasWorkingAC` and `comprehensiveInsurance`. Invalidates vehicle list queries
 * so a newly-created vehicle shows up immediately if the owner browses it.
 */
export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vehicle) => apiPost('/vehicles/create-vehicle', buildVehicleRequest(vehicle)),
    onSuccess: (created) => {
      // A new vehicle starts unavailable and so isn't in the public list — remember it so it can be fetched by id.
      rememberOwnVehicle(useAuthStore.getState().user?.id, created?.id);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      // `hasAddedVehicleToProfile` lives on GET /users/me — refresh it so the
      // "add a vehicle" prompt clears as soon as the first vehicle exists.
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to create vehicle. Please try again.');
    },
  });
}

/**
 * Saves changes to a vehicle: `PUT /vehicles/{id}` with the edit form's values (a PUT replaces the vehicle, so every
 * field is sent, and the vehicle's existing insurance sticker address is kept unless the caller replaces it
 * afterwards with `useAttachInsuranceSticker`). Pass `{ vehicle, values }`.
 *
 * A 200 isn't taken as proof: the answer must carry the changed details back, otherwise the save is reported as
 * failed (this backend has answered 200 while ignoring a field before).
 */
export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vehicle, values }) => {
      const request = { ...buildVehicleRequest(values), insuranceVerificationStickerPhoto: vehicle.insuranceVerificationStickerPhoto };
      const body = Object.fromEntries(Object.entries(request).filter(([, value]) => value !== undefined && value !== null));
      const updated = await apiPut(`/vehicles/${vehicle.id}`, body);
      const same = (a, b) => a === undefined || String(a) === String(b);
      const kept =
        same(updated?.model, values.model) &&
        same(updated?.registrationNumber, values.registrationNumber) &&
        same(updated?.location, values.location) &&
        same(updated?.color, values.color) &&
        (updated?.pricePerDay === undefined || Number(updated.pricePerDay) === Number(values.pricePerDay));
      if (!kept) {
        const error = new Error("The server answered, but didn't keep your changes.");
        error.local = true;
        throw error;
      }
      return updated;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
    onError: (error) => toast.error(error?.local ? error.message : apiErrorMessage(error, "Couldn't save the vehicle.")),
  });
}

/**
 * Attaches the mandatory insurance sticker photo to a vehicle that was just
 * created. There's no dedicated upload endpoint, so the file goes up through
 * `POST /vehicles/{id}/photos` (which answers with its `url`) and the vehicle is
 * then updated with that URL as `insuranceVerificationStickerPhoto` — the update
 * also restates the vehicle's own details, since a PUT replaces the vehicle, and the
 * answer is checked for the sticker (see below). Unlike
 * a normal photo, the file is deliberately NOT remembered as a gallery photo:
 * renters shouldn't see an insurance sticker among the car's pictures.
 * Pass `{ vehicle, file }`.
 */
export function useAttachInsuranceSticker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vehicle, file }) => {
      const formData = new FormData();
      formData.append('file', file);
      const photo = await apiUpload(`/vehicles/${vehicle.id}/photos`, formData);
      const updated = await apiPut(`/vehicles/${vehicle.id}`, {
        ...vehicleToRequest(vehicle),
        comprehensiveInsurance: true,
        insuranceVerificationStickerPhoto: photoSrc(photo.url),
      });
      // A 200 isn't proof (an earlier backend accepted this field and then didn't store it). Only call it
      // saved when the vehicle that comes back actually carries the sticker.
      if (!updated?.insuranceVerificationStickerPhoto) throw new Error('The server did not keep the insurance sticker photo.');
      return updated;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

/**
 * Uploads one photo for a vehicle via `POST /vehicles/{id}/photos`
 * (multipart). Call once per file — there's no documented bulk-upload
 * endpoint.
 */
export function useUploadVehiclePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vehicleId, file, onProgress }) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiUpload(`/vehicles/${vehicleId}/photos`, formData, onProgress);
    },
    // The upload response is the only time the backend reveals a photo's URL, so keep it (with its angle).
    onSuccess: (photo, { vehicleId, file }) => {
      rememberPhoto(vehicleId, photo, angleFromFileName(file?.name));
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

/**
 * Removes one photo — `DELETE /vehicles/{id}/photos/{photoId}`. Pass `{ vehicleId, photoId }`. (The photo's id is only known for
 * photos uploaded from this browser: the backend doesn't list a vehicle's photos.)
 */
export function useDeleteVehiclePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, photoId }) => apiDelete(`/vehicles/${vehicleId}/photos/${photoId}`),
    onSuccess: (data, { vehicleId, photoId }) => {
      forgetPhoto(vehicleId, photoId);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Photo removed.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't remove that photo.")),
  });
}

/**
 * Replaces one photo with another file. The backend has no "replace", so this uploads the new photo FIRST and only then
 * deletes the old one — if the upload fails nothing is lost, and if only the delete fails the vehicle keeps both (and the person
 * is told). The new photo takes the old one's angle (front, left…) so it stays in the same slot.
 * Pass `{ vehicleId, photoId, file }`.
 */
export function useReplaceVehiclePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ vehicleId, photoId, file }) => {
      const angle = getPhotoAngle(vehicleId, photoId);
      const upload = angle ? new File([file], angleFileName(angle, file), { type: file.type }) : file;
      const formData = new FormData();
      formData.append('file', upload);
      const added = await apiUpload(`/vehicles/${vehicleId}/photos`, formData);
      rememberPhoto(vehicleId, added, angle || angleFromFileName(upload.name));
      try {
        await apiDelete(`/vehicles/${vehicleId}/photos/${photoId}`);
        forgetPhoto(vehicleId, photoId);
      } catch (error) {
        const partial = new Error("The new photo was added, but the old one couldn't be removed.");
        partial.local = true;
        partial.cause = error;
        throw partial;
      }
      return added;
    },
    onSuccess: () => toast.success('Photo replaced.'),
    onError: (error) => toast.error(error?.local ? error.message : apiErrorMessage(error, "Couldn't replace that photo.")),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}
