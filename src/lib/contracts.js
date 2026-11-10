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

/**
 * Remembers a contract's id against its booking — see `sessionContractId` below. Kept in `localStorage` (and this
 * tab's `sessionStorage`), so it survives a new tab, a pasted link or a closed tab on the same device; it used to be
 * this tab only, and the signing page then couldn't find the contract anywhere else.
 */
export function stashContractId(bookingId, contractId) {
  if (!bookingId || !contractId) return;
  for (const store of [sessionStorage, localStorage]) {
    try {
      store.setItem(`contract:${bookingId}`, contractId);
    } catch {
      // Storage full or blocked: the other one may still hold it.
    }
  }
}

/**
 * A contract's id for a booking, if this browser has one — `BookingResponse` has no `contractId` field and there's
 * no lookup by booking (docs/backend-requests.md item 13), so the only source is what `stashContractId` remembered
 * when the contract was drafted, accepted, or opened from its notification (`/contracts/{id}/sign`) on this device.
 * @param {string} bookingId
 * @returns {string|null}
 */
export function sessionContractId(bookingId) {
  if (!bookingId) return null;
  for (const store of [sessionStorage, localStorage]) {
    try {
      const id = store.getItem(`contract:${bookingId}`);
      if (id) return id;
    } catch {
      // Blocked storage: try the other.
    }
  }
  return null;
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
