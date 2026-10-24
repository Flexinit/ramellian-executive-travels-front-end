import React from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import DocumentChecklist from '../components/documents/DocumentChecklist';
import { useCurrentUser } from '../hooks/useProfile';
import { ACCOUNT_TYPES } from '../lib/constants';

/**
 * Upload the documents your account needs. Which ones are listed depends on
 * the account type set in the profile: everyone gets the identity document,
 * driving licence and proof of address; a Business account also gets its
 * registration and tax certificates (the backend rejects those for anyone
 * whose profile isn't Business).
 */
export default function DocumentsPage() {
  const { data: currentUser } = useCurrentUser();

  return (
    <>
      <PageWrapper>
        <PageTitle title="My Documents" />
        <div className="flex flex-col gap-6 max-w-2xl">
          <div>
            <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Documents</h1>
            <p className="text-muted text-sm mt-1">
              Upload and verify these to use your account. Approval usually takes a few hours.
              {currentUser && !currentUser.ownerType && (
                <> Choose Individual or Business in your profile to see every document your account needs.</>
              )}
              {currentUser?.ownerType === ACCOUNT_TYPES.BUSINESS && <> As a business account you also need your registration and tax certificates.</>}
            </p>
          </div>

          <DocumentChecklist accountType={currentUser?.ownerType} />
        </div>
      </PageWrapper>
    </>
  );
}
