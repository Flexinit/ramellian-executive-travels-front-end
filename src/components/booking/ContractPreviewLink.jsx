import React, { useState } from 'react';
import { FileText, FileX } from 'lucide-react';
import Modal from '../ui/Modal';
import ContractViewer from '../payment/ContractViewer';
import Spinner from '../ui/Spinner';
import ErrorBanner from '../ui/ErrorBanner';
import EmptyState from '../ui/EmptyState';
import { useContractPreview } from '../../hooks/useContract';

/**
 * "Preview rental terms" — a look at this vehicle's owner's rental contract before signing up, now that
 * that's possible (`docs/backend-requests.md` item 2). Read-only and optional: it does not replace the real
 * contract review, which still happens per booking, right before payment, once an account exists — this is
 * only for a renter who wants to see the terms sooner. Renders nothing if the vehicle has no `ownerId`.
 *
 * @param {string} [ownerId]
 */
export default function ContractPreviewLink({ ownerId }) {
  const [open, setOpen] = useState(false);
  const preview = useContractPreview(open ? ownerId : undefined);

  if (!ownerId) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 self-start text-brand-gold text-sm font-semibold hover:text-brand-gold-light transition-colors focus-ring rounded-md"
      >
        <FileText size={14} aria-hidden="true" />
        Preview rental terms
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Rental Terms" size="lg">
        {preview.isLoading && (
          <div className="flex justify-center py-10">
            <Spinner size="lg" label="Loading rental terms" />
          </div>
        )}
        {preview.isError && (
          preview.error?.response?.status === 404 ? (
            <EmptyState
              icon={FileX}
              title="Terms not published yet"
              description="This vehicle's owner hasn't published approved rental terms yet. You'll still read and accept their contract before you pay."
            />
          ) : (
            <ErrorBanner message="Could not load this owner's rental terms. Please try again." onRetry={() => preview.refetch()} />
          )
        )}
        {preview.isSuccess && (
          <>
            <p className="text-brand-grey text-xs -mt-2 mb-3">
              A preview only — you&apos;ll read and accept the terms for your specific booking just before you pay.
            </p>
            <ContractViewer contractText={preview.data?.content} />
          </>
        )}
      </Modal>
    </>
  );
}
