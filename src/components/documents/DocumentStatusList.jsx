import React from 'react';
import { FileCheck2, FileClock, FileX2, File } from 'lucide-react';
import Badge from '../ui/Badge';
import { DOCUMENT_STATUSES, DOCUMENT_TYPES } from '../../lib/constants';

const STATUS_META = {
  [DOCUMENT_STATUSES.APPROVED]: { icon: FileCheck2, variant: 'success', label: 'Approved' },
  [DOCUMENT_STATUSES.PENDING]: { icon: FileClock, variant: 'warning', label: 'Pending Review' },
  [DOCUMENT_STATUSES.REJECTED]: { icon: FileX2, variant: 'danger', label: 'Rejected' },
};

const TYPE_LABELS = {
  [DOCUMENT_TYPES.NATIONAL_ID]: 'National ID',
  [DOCUMENT_TYPES.PASSPORT]: 'Passport',
  [DOCUMENT_TYPES.DRIVING_LICENSE]: 'Driving Licence',
  [DOCUMENT_TYPES.PROOF_OF_ADDRESS]: 'Proof of Address',
  [DOCUMENT_TYPES.BUSINESS_REGISTRATION]: 'Business Registration Certificate',
  [DOCUMENT_TYPES.TAX_CERTIFICATE]: 'Tax Certificate',
};

/**
 * Compact list of a renter's documents and their approval status — a quick
 * glance summary (e.g. for the dashboard), separate from the fuller
 * `DocumentUploadCard` that actually handles uploading.
 *
 * @param {Array<{type: string, status: string}>} documents
 */
export default function DocumentStatusList({ documents = [] }) {
  if (documents.length === 0) {
    return <p className="text-brand-grey text-sm">No documents uploaded yet.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-white/10">
      {documents.map((doc) => {
        const meta = STATUS_META[doc.status] || STATUS_META[DOCUMENT_STATUSES.PENDING];
        const Icon = meta.icon || File;
        return (
          <li key={doc.id || doc.type} className="flex items-center justify-between gap-3 py-3">
            <span className="inline-flex items-center gap-2.5 text-sm text-brand-white">
              <Icon size={15} className="text-brand-gold shrink-0" aria-hidden="true" />
              {TYPE_LABELS[doc.type] || doc.type}
            </span>
            <Badge label={meta.label} variant={meta.variant} />
          </li>
        );
      })}
    </ul>
  );
}
