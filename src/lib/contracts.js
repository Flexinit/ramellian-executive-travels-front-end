import toast from 'react-hot-toast';
import { api } from './api';

/**
 * Fetches a contract's PDF as a `Blob` via the authenticated `api` axios instance — the document endpoint
 * needs the JWT bearer header, which neither a plain `<a href>`/browser navigation nor handing react-pdf
 * a bare URL can attach. Shared by `downloadContract` and `ContractPreviewModal` (which renders the same
 * blob inline, in a modal, rather than this fetching it twice).
 * @param {string} contractId
 * @param {boolean} signed — the signed copy vs. the original unsigned one
 * @returns {Promise<Blob>}
 */
export async function fetchContractBlob(contractId, signed) {
  const res = await api.get(`/payments/contracts/${contractId}/document`, {
    params: { signed },
    responseType: 'blob',
  });
  return res.data;
}

/**
 * Downloads a contract's PDF.
 * @param {string} contractId
 * @param {boolean} signed — the signed copy vs. the original unsigned one
 */
export async function downloadContract(contractId, signed) {
  try {
    const blob = await fetchContractBlob(contractId, signed);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-${contractId}${signed ? '-signed' : ''}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    toast.error('Could not download the contract.');
  }
}

/** Stashes a freshly-drafted contract's id against its booking — see `sessionContractId` below. */
export function stashContractId(bookingId, contractId) {
  if (bookingId && contractId) sessionStorage.setItem(`contract:${bookingId}`, contractId);
}

/**
 * A contract's id for a booking, if this browser session has one — `BookingResponse` has no `contractId`
 * field (see docs/backend-requests.md item 13), so the only source is the `sessionStorage` stash
 * `useContractDraft` writes the moment a contract is first drafted. Only ever populated for a booking
 * whose contract was drafted in this same tab's session (closing the tab loses it — there's no backend
 * lookup by booking id to fall back on).
 * @param {string} bookingId
 * @returns {string|null}
 */
export function sessionContractId(bookingId) {
  return (bookingId && sessionStorage.getItem(`contract:${bookingId}`)) || null;
}

/**
 * Downloads a booking's official receipt as the backend makes it — `GET /payments/bookings/{bookingId}/receipt`
 * (a PDF, live spec 2026-10-16), fetched with the signed-in person's token.
 * @param {string} bookingId
 */
export async function downloadBookingReceipt(bookingId) {
  try {
    const res = await api.get(`/payments/bookings/${bookingId}/receipt`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${bookingId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    toast.error('Could not download the receipt.');
  }
}
