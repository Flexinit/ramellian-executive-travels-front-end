import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiGet, apiPost, apiUpload } from '../lib/api';
import { stashContractId } from '../lib/contracts';
import { useCartStore } from '../store/cartStore';
import { dataUrlToBlob } from '../lib/utils';

/**
 * Contract mutations/queries per FRONTEND_INTEGRATION.md §3-4. Note the
 * `/payments` prefix on these paths — `src/lib/api.js`'s base URL already
 * includes `/api/v1`, so these resolve to
 * `/api/v1/payments/bookings/{id}/contract/...` etc. As with the other
 * resource hooks, endpoints are documented; exact response field names
 * (`contractText`, `id` on the contract, etc.) are assumed — verify
 * against VITE_SWAGGER_URL.
 */

/**
 * An owner's active contract template — `GET /contract-templates/owners/{ownerId}/active` →
 * `ContractTemplateResponse` (`content` is the terms text). Confirmed live as public (404 "Owner not found"
 * on a bad id, not 401/403) — added to the backend 2026-09-27 (`docs/backend-requests.md` item 2), so a
 * visitor can read a vehicle's owner's terms before signing up. This is a *preview* only: the terms are
 * still read and accepted for real, per booking, at `POST /payments/bookings/{bookingId}/contract/draft`
 * right before payment — unchanged, per how the checkout flow is meant to work.
 */
export function useContractPreview(ownerId) {
  return useQuery({
    queryKey: ['contract-templates', 'owner-active', ownerId],
    queryFn: () => apiGet(`/contract-templates/owners/${ownerId}/active`),
    enabled: !!ownerId,
    retry: false,
  });
}

/**
 * Creates (or re-creates) the frozen contract draft for a booking. Stashes the contract's own `id` in
 * sessionStorage, keyed by booking id — `BookingResponse` (confirmed against the live swagger spec) has
 * no `contractId` field, so SignaturePage has no other way to know which contract to sign, and
 * sessionStorage (not React Router navigation state) is what survives Pesapal's full-page redirect back
 * (see PaymentPage). This is the earliest point in the flow the id is available, so it's stashed here
 * rather than in `useAcceptContract`, and it's re-stashed for every vehicle in a grouped checkout since
 * each gets its own draft.
 */
export function useContractDraft() {
  return useMutation({
    mutationFn: (bookingId) => apiPost(`/payments/bookings/${bookingId}/contract/draft`),
    onSuccess: (data, bookingId) => stashContractId(bookingId, data?.id),
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Could not prepare your contract. Please try again.');
    },
  });
}

/** The next cart item (in selection order) that hasn't yet reached `flag`, or null if every item has. */
function nextUnfinished(items, flag) {
  return items.find((i) => !i[flag]) || null;
}

/**
 * Accepts the contract terms for one booking, then moves on:
 *  - not part of a group (a single-vehicle checkout) — straight to that booking's payment, as before.
 *  - part of a group (`docs/backend-requests.md` item 1) — on to the *next* booking in the group that still
 *    needs its own contract accepted (each vehicle has its own owner and terms), or, once every booking in
 *    the group has one accepted, on to the group's single combined payment (`GroupPaymentPage`).
 */
export function useAcceptContract() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (bookingId) => apiPost(`/payments/bookings/${bookingId}/contract/accept`, { accepted: true }),
    onSuccess: (_data, bookingId) => {
      const { items, groupId, updateItem } = useCartStore.getState();
      const current = items.find((i) => i.bookingId === bookingId);
      if (current) updateItem(current.vehicleId, { contractAccepted: true });

      // `replace: true` on every forward step here: without it, the browser's Back button would return
      // to a contract page whose contract was already accepted, and the backend refuses to re-draft a
      // contract for a booking that's no longer pending — see ContractPage.jsx.
      if (!groupId) {
        navigate(`/book/${bookingId}/payment`, { state: { bookingId }, replace: true });
        return;
      }
      const updated = current ? { ...current, contractAccepted: true } : current;
      const rest = items.map((i) => (i.vehicleId === current?.vehicleId ? updated : i));
      const next = nextUnfinished(rest, 'contractAccepted');
      if (next) {
        navigate(`/book/${next.bookingId}/contract`, { state: { bookingId: next.bookingId }, replace: true });
      } else {
        navigate(`/book/group/${groupId}/payment`, { state: { groupId }, replace: true });
      }
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Could not accept the contract. Please try again.');
    },
  });
}

/** Fetches a contract's full detail by id (used on the signature page). */
export function useContract(contractId) {
  return useQuery({
    queryKey: ['contracts', contractId],
    queryFn: () => apiGet(`/payments/contracts/${contractId}`),
    enabled: !!contractId,
  });
}

/**
 * Submits the renter's signature (base64 PNG) and consent for a contract, then moves on:
 *  - not part of a group — straight to that booking's own confirmation page, as before.
 *  - part of a group — on to signing the *next* booking's contract, or, once every booking in the group is
 *    signed, to the confirmation page (which then clears the whole group at once — see BookingConfirmPage).
 *
 * `POST .../sign?consent=true`, signature as a `multipart/form-data` file part — not `PUT` with a JSON
 * body, which the OpenAPI spec says (it even marks `signature` `format: binary` while claiming
 * `application/json`, which doesn't really make sense together) but which 403s before ever reaching the
 * business logic. Confirmed live, isolating each piece: `PUT` alone 403s regardless of where `consent`
 * goes; `POST` reaches the real handler (a 409 "Successful payment is required before signing" on an
 * unpaid contract) whether `consent` is this query param or a form field — the query param is kept here
 * to match the backend team's own stated contract even though either works today.
 */
export function useSignContract() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ contractId, signature, bookingId }) => {
      const formData = new FormData();
      formData.append('signature', dataUrlToBlob(signature), 'signature.png');
      return apiUpload(`/payments/contracts/${contractId}/sign?consent=true`, formData, undefined, 'post').then((data) => ({
        ...data,
        bookingId,
      }));
    },
    onSuccess: (data) => {
      toast.success('Contract signed.');
      const { items, groupId, updateItem } = useCartStore.getState();
      const current = items.find((i) => i.bookingId === data.bookingId);
      if (current) updateItem(current.vehicleId, { signed: true });

      // `replace: true` throughout, same reasoning as useAcceptContract above — a signed contract can't be
      // re-signed, so the page it came from shouldn't be reachable again via Back.
      if (!groupId) {
        navigate(`/book/${data.bookingId}/confirm`, { replace: true });
        return;
      }
      const updated = current ? { ...current, signed: true } : current;
      const rest = items.map((i) => (i.vehicleId === current?.vehicleId ? updated : i));
      const next = nextUnfinished(rest, 'signed');
      navigate(
        next ? `/book/${next.bookingId}/sign` : `/book/${data.bookingId}/confirm`,
        { ...(next ? { state: { bookingId: next.bookingId } } : {}), replace: true }
      );
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Could not submit your signature. Please try again.');
    },
  });
}
