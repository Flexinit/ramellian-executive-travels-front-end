import React, { useRef, useState } from 'react';
import { Upload, FileCheck2, FileClock, FileX2 } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import DocumentFilePreview from './DocumentFilePreview';
import { DOCUMENT_STATUSES } from '../../lib/constants';
import { useUploadDocument } from '../../hooks/useDocuments';
import { useUpdateProfile } from '../../hooks/useProfile';

const STATUS_META = {
  [DOCUMENT_STATUSES.APPROVED]: { icon: FileCheck2, variant: 'success', label: 'Approved' },
  [DOCUMENT_STATUSES.PENDING]: { icon: FileClock, variant: 'warning', label: 'Pending Review' },
  [DOCUMENT_STATUSES.REJECTED]: { icon: FileX2, variant: 'danger', label: 'Rejected' },
};

const ACCEPTED_TYPES = 'image/jpeg,image/png,application/pdf';

/**
 * One document's upload slot — once something is on file, it shows the file itself (the same inline
 * preview / full-size viewer an administrator reviewing it sees, via `GET /documents/{id}/content`), not
 * just a status badge, so the renter can check they uploaded the right photo. A drag-and-drop /
 * click-to-browse dropzone appears whenever nothing's uploaded yet, or the last one was rejected.
 *
 * @param {string} type — a DOCUMENT_TYPES value, sent to the upload endpoint
 * @param {string} title
 * @param {string} description
 * @param {object} [document] — existing record for this type, if any: { status, rejectionReason }
 * @param {boolean} [requireIdNumber] — also collect an ID number alongside the file. It isn't part of the
 *   document upload itself — the backend keeps it on the profile (`ProfileRequest.idNumber`) — so it's
 *   saved there first (only if it actually changed) before the file upload starts.
 * @param {string} [currentIdNumber] — the id number already on file, to prefill the field with
 */
export default function DocumentUploadCard({ type, title, description, document, requireIdNumber = false, currentIdNumber = '' }) {
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [idNumber, setIdNumber] = useState(currentIdNumber);
  const [idNumberError, setIdNumberError] = useState('');
  const inputRef = useRef(null);
  const upload = useUploadDocument();
  const updateProfile = useUpdateProfile();

  const status = document?.status;
  const meta = status && STATUS_META[status];
  const canUpload = !status || status === DOCUMENT_STATUSES.REJECTED;

  function handleFile(file) {
    if (!file) return;
    const trimmedId = idNumber.trim();
    if (requireIdNumber && !trimmedId) {
      inputRef.current && (inputRef.current.value = '');
      setIdNumberError('Enter your ID number first — the backend checks for it alongside the document.');
      return;
    }
    setIdNumberError('');
    setProgress(0);
    const doUpload = () => upload.mutate({ type, file, onProgress: setProgress });
    if (requireIdNumber && trimmedId !== currentIdNumber) {
      updateProfile.mutate({ idNumber: trimmedId }, { onSuccess: doUpload });
    } else {
      doUpload();
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-brand-white font-semibold">{title}</h3>
          {description && <p className="text-brand-grey text-xs mt-1">{description}</p>}
        </div>
        {meta && (
          <Badge label={meta.label} variant={meta.variant} className="shrink-0" />
        )}
      </div>

      {status === DOCUMENT_STATUSES.REJECTED && document?.rejectionReason && (
        <p className="text-red-400 text-xs">{document.rejectionReason}</p>
      )}

      <DocumentFilePreview document={document} />

      {requireIdNumber && canUpload && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${type}-id-number`} className="text-sm font-medium text-brand-white">
            ID Number
          </label>
          <input
            id={`${type}-id-number`}
            type="text"
            value={idNumber}
            onChange={(e) => {
              setIdNumber(e.target.value);
              if (idNumberError) setIdNumberError('');
            }}
            placeholder="e.g. 12345678"
            className={`w-full rounded-lg bg-white/5 border px-3 py-2.5 text-brand-white placeholder-brand-grey text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent transition ${idNumberError ? 'border-red-500/50' : 'border-white/10 hover:border-brand-gold/50'}`}
          />
          {idNumberError && <p role="alert" className="text-red-400 text-xs">{idNumberError}</p>}
        </div>
      )}

      {canUpload && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed px-4 py-6 flex flex-col items-center justify-center gap-2 text-center transition-colors ${
            dragOver ? 'border-brand-gold bg-brand-gold/5' : 'border-white/15 hover:border-brand-gold/40'
          }`}
        >
          {upload.isPending || updateProfile.isPending ? (
            <>
              <Spinner size="md" label="Uploading" />
              <div className="w-full max-w-[180px] h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                <div
                  className="h-full bg-brand-gold transition-all duration-200"
                  style={{ width: `${updateProfile.isPending ? 0 : progress}%` }}
                />
              </div>
              <p className="text-brand-grey text-xs">{updateProfile.isPending ? 'Saving your ID number…' : `${progress}%`}</p>
            </>
          ) : (
            <>
              <Upload size={22} className="text-brand-gold" aria-hidden="true" />
              <p className="text-brand-white text-sm font-medium">Drop a file, or browse</p>
              <p className="text-brand-grey text-xs">JPG, PNG or PDF</p>
              <label className="mt-1 text-xs font-semibold text-brand-gold hover:text-brand-gold-light cursor-pointer focus-within:ring-2 focus-within:ring-brand-gold rounded-md px-1">
                Choose file
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  className="sr-only"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </label>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
