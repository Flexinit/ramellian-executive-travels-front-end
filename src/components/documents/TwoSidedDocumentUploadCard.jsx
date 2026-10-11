import React, { useEffect, useRef, useState } from 'react';
import { Upload, X, FileCheck2, FileClock, FileX2 } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import DocumentFilePreview from './DocumentFilePreview';
import { DOCUMENT_STATUSES } from '../../lib/constants';
import { useUploadDocument } from '../../hooks/useDocuments';
import { useUpdateProfile } from '../../hooks/useProfile';
import { composeFrontBack } from '../../lib/composeFrontBack';

const STATUS_META = {
  [DOCUMENT_STATUSES.APPROVED]: { icon: FileCheck2, variant: 'success', label: 'Approved' },
  [DOCUMENT_STATUSES.PENDING]: { icon: FileClock, variant: 'warning', label: 'Pending Review' },
  [DOCUMENT_STATUSES.REJECTED]: { icon: FileX2, variant: 'danger', label: 'Rejected' },
};

const ACCEPTED_TYPES = 'image/jpeg,image/png';

/** One side's picker: a thumbnail once chosen, or a small dropzone. */
function SidePicker({ label, file, onPick, onClear, disabled }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-brand-white">{label}</span>
      {file ? (
        <div className="relative rounded-lg overflow-hidden border border-white/10">
          <img src={url} alt={`${label} preview`} className="w-full h-32 object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={onClear}
              aria-label={`Remove ${label.toLowerCase()} photo`}
              className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 focus-ring"
            >
              <X size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            !disabled && onPick(e.dataTransfer.files?.[0]);
          }}
          className={`h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-center transition-colors ${
            dragOver ? 'border-brand-gold bg-brand-gold/5' : 'border-white/15 hover:border-brand-gold/40'
          }`}
        >
          <Upload size={18} className="text-brand-gold" aria-hidden="true" />
          <label className="text-xs font-semibold text-brand-gold hover:text-brand-gold-light cursor-pointer focus-within:ring-2 focus-within:ring-brand-gold rounded-md px-1">
            Choose photo
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              className="sr-only"
              disabled={disabled}
              onChange={(e) => onPick(e.target.files?.[0])}
            />
          </label>
        </div>
      )}
    </div>
  );
}

/**
 * A document that needs both sides — National ID, Driving Licence — captured as two separate photos and
 * combined into one image before it's sent. The backend's `documentType` only accepts a fixed set of
 * values (confirmed live: a made-up one like `NATIONAL_ID_FRONT` is refused with 400 "Invalid document
 * type"), so there's no way to store the front and back as two separate documents today — this stacks
 * them into a single labelled image instead, so both sides are still captured and still visible to
 * whoever reviews it, through the one-file-per-type upload that already exists.
 *
 * @param {string} type — a DOCUMENT_TYPES value, sent to the upload endpoint
 * @param {string} title
 * @param {string} description
 * @param {object} [document] — existing record for this type, if any: { status, rejectionReason }
 * @param {boolean} [requireIdNumber]
 * @param {string} [currentIdNumber]
 */
export default function TwoSidedDocumentUploadCard({ type, title, description, document, requireIdNumber = false, currentIdNumber = '' }) {
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [idNumber, setIdNumber] = useState(currentIdNumber);
  const [idNumberError, setIdNumberError] = useState('');
  const [composing, setComposing] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [progress, setProgress] = useState(0);
  const upload = useUploadDocument();
  const updateProfile = useUpdateProfile();

  const status = document?.status;
  const meta = status && STATUS_META[status];
  const canUpload = !status || status === DOCUMENT_STATUSES.REJECTED;
  const busy = composing || upload.isPending || updateProfile.isPending;

  async function handleSubmit() {
    const trimmedId = idNumber.trim();
    if (requireIdNumber && !trimmedId) {
      setIdNumberError('Enter your ID number first — the backend checks for it alongside the document.');
      return;
    }
    setIdNumberError('');
    setComposeError('');
    try {
      setComposing(true);
      const combined = await composeFrontBack(front, back);
      setComposing(false);
      setProgress(0);
      const file = new File([combined], `${type.toLowerCase()}.jpg`, { type: 'image/jpeg' });
      const doUpload = () => upload.mutate({ type, file, onProgress: setProgress });
      if (requireIdNumber && trimmedId !== currentIdNumber) {
        updateProfile.mutate({ idNumber: trimmedId }, { onSuccess: doUpload });
      } else {
        doUpload();
      }
    } catch (err) {
      setComposing(false);
      setComposeError(err?.message || 'Could not combine the two photos. Please try again.');
    }
  }

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-brand-white font-semibold">{title}</h3>
          {description && <p className="text-brand-grey text-xs mt-1">{description}</p>}
        </div>
        {meta && <Badge label={meta.label} variant={meta.variant} className="shrink-0" />}
      </div>

      {status === DOCUMENT_STATUSES.REJECTED && document?.rejectionReason && (
        <p className="text-red-400 text-xs">{document.rejectionReason}</p>
      )}

      <DocumentFilePreview document={document} />

      {canUpload && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <SidePicker label="Front" file={front} onPick={setFront} onClear={() => setFront(null)} disabled={busy} />
            <SidePicker label="Back" file={back} onPick={setBack} onClear={() => setBack(null)} disabled={busy} />
          </div>

          {requireIdNumber && (
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

          {composeError && <p role="alert" className="text-red-400 text-xs">{composeError}</p>}

          {busy ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Spinner size="md" label={composing ? 'Combining photos' : 'Uploading'} />
              <p className="text-brand-grey text-xs">
                {updateProfile.isPending ? 'Saving your ID number…' : composing ? 'Combining your photos…' : `${progress}%`}
              </p>
            </div>
          ) : (
            <Button size="sm" disabled={!front || !back} onClick={handleSubmit} className="self-start">
              Submit both sides
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
