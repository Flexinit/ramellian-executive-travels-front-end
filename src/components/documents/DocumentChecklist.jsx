import React from 'react';
import Spinner from '../ui/Spinner';
import ErrorBanner from '../ui/ErrorBanner';
import DocumentUploadCard from './DocumentUploadCard';
import TwoSidedDocumentUploadCard from './TwoSidedDocumentUploadCard';
import { useDocuments } from '../../hooks/useDocuments';
import { getDocumentSlots, isRenterUser } from '../../lib/documents';
import { useAuthStore } from '../../store/authStore';
import { apiErrorMessage } from '../../lib/apiError';

/**
 * The upload slots this account is asked for — the identity document,
 * proof of address, a driving licence (car renters only), and (for a Business account) its
 * registration and tax certificates. Used by the Documents page and, inline,
 * by the profile page and the post-login setup guide so documents can be
 * uploaded right where the profile is completed.
 *
 * @param {string} [accountType] — the account's `ownerType`
 */
export default function DocumentChecklist({ accountType }) {
  const { data: documents, isLoading, isError, error, refetch } = useDocuments();
  const isRenter = useAuthStore((s) => isRenterUser(s.user));
  const idNumber = useAuthStore((s) => s.user?.idNumber);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" label="Loading documents" />
      </div>
    );
  }

  if (isError) {
    return <ErrorBanner message={apiErrorMessage(error, 'Failed to load your documents.')} onRetry={refetch} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {getDocumentSlots(accountType, { isRenter }).map((slot) => {
        const Card = slot.twoSided ? TwoSidedDocumentUploadCard : DocumentUploadCard;
        return (
          <Card
            key={slot.type}
            type={slot.type}
            title={slot.title}
            description={slot.description}
            document={documents?.find((d) => d.type === slot.type)}
            requireIdNumber={slot.requireIdNumber}
            currentIdNumber={idNumber || ''}
          />
        );
      })}
    </div>
  );
}
