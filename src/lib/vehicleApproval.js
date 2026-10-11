/**
 * Vehicle approval, from the backend's `approvalStatus` (`PENDING`, `APPROVED`, `REJECTED`). Vehicles added before
 * approval existed have no status at all; the public list only shows APPROVED vehicles, so to everyone they are
 * "not approved yet" and an administrator needs to decide on them just like a PENDING one.
 */

/** @returns {'PENDING'|'APPROVED'|'REJECTED'} a vehicle's status, treating "no status" as waiting for a decision */
export function approvalOf(vehicle) {
  const status = String(vehicle?.approvalStatus || '').toUpperCase();
  return status === 'APPROVED' || status === 'REJECTED' ? status : 'PENDING';
}

/** Whether a decision is still needed (pending, or a vehicle from before approval existed). */
export const needsReview = (vehicle) => approvalOf(vehicle) === 'PENDING';

/** Short words for badges. `legacy` is a vehicle with no status recorded. */
export function approvalLabel(vehicle) {
  const status = approvalOf(vehicle);
  if (status === 'APPROVED') return 'Approved';
  if (status === 'REJECTED') return 'Rejected';
  return vehicle?.approvalStatus ? 'Awaiting approval' : 'Not approved yet';
}

export function approvalVariant(vehicle) {
  const status = approvalOf(vehicle);
  return status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'danger' : 'warning';
}

/** The three groups the approvals page shows. */
export const APPROVAL_FILTERS = Object.freeze([
  { value: 'REVIEW', label: 'Needs review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
]);

export function matchesApprovalFilter(vehicle, filter) {
  if (filter === 'ALL') return true;
  if (filter === 'REVIEW') return needsReview(vehicle);
  return approvalOf(vehicle) === filter;
}
