import React, { useRef, useState } from 'react';
import { Upload, FileCheck2, FileClock, FileX2 } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import DocumentFilePreview from './DocumentFilePreview';
import { DOCUMENT_STATUSES } from '../../lib/constants';
import { useUploadDocument } from '../../hooks/useDocuments';

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
 */
export default function DocumentUploadCard({ type, title, description, document }) {
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);
  const upload = useUploadDocument();

  const status = document?.status;
  const meta = status && STATUS_META[status];
  const canUpload = !status || status === DOCUMENT_STATUSES.REJECTED;

  function handleFile(file) {
    if (!file) return;
    setProgress(0);
    upload.mutate({ type, file, onProgress: setProgress });
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
          <h3 className="font-heading text-ink font-semibold">{title}</h3>
          {description && <p className="text-muted text-xs mt-1">{description}</p>}
        </div>
        {meta && (
          <Badge label={meta.label} variant={meta.variant} className="shrink-0" />
        )}
      </div>

      {status === DOCUMENT_STATUSES.REJECTED && document?.rejectionReason && (
        <p className="text-red-600 text-xs">{document.rejectionReason}</p>
      )}

      <DocumentFilePreview document={document} />

      {canUpload && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed px-4 py-6 flex flex-col items-center justify-center gap-2 text-center transition-colors ${
            dragOver ? 'border-accent bg-accent/5' : 'border-ink/15 hover:border-accent/40'
          }`}
        >
          {upload.isPending ? (
            <>
              <Spinner size="md" label="Uploading" />
              <div className="w-full max-w-[180px] h-1.5 rounded-full bg-ink/10 overflow-hidden mt-1">
                <div
                  className="h-full bg-accent transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-muted text-xs">{progress}%</p>
            </>
          ) : (
            <>
              <Upload size={22} className="text-accent" aria-hidden="true" />
              <p className="text-ink text-sm font-medium">Drop a file, or browse</p>
              <p className="text-muted text-xs">JPG, PNG or PDF</p>
              <label className="mt-1 text-xs font-semibold text-accent hover:text-accent-hover cursor-pointer focus-within:ring-2 focus-within:ring-accent rounded-md px-1">
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
