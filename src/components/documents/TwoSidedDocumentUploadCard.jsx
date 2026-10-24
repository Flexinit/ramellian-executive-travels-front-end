import React, { useState } from 'react';
import { FileCheck2, FileClock, FileX2 } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import DocumentFilePreview from './DocumentFilePreview';
import ShotPicker from './ShotPicker';
import { DOCUMENT_STATUSES } from '../../lib/constants';
import { useUploadDocument } from '../../hooks/useDocuments';
import { composeFrontBack } from '../../lib/composeFrontBack';

const STATUS_META = {
  [DOCUMENT_STATUSES.APPROVED]: { icon: FileCheck2, variant: 'success', label: 'Approved' },
  [DOCUMENT_STATUSES.PENDING]: { icon: FileClock, variant: 'warning', label: 'Pending Review' },
  [DOCUMENT_STATUSES.REJECTED]: { icon: FileX2, variant: 'danger', label: 'Rejected' },
};

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
 */
export default function TwoSidedDocumentUploadCard({ type, title, description, document }) {
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [composing, setComposing] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [progress, setProgress] = useState(0);
  const upload = useUploadDocument();

  const status = document?.status;
  const meta = status && STATUS_META[status];
  const canUpload = !status || status === DOCUMENT_STATUSES.REJECTED;
  const busy = composing || upload.isPending;

  async function handleSubmit() {
    setComposeError('');
    try {
      setComposing(true);
      const combined = await composeFrontBack(front, back);
      setComposing(false);
      setProgress(0);
      const file = new File([combined], `${type.toLowerCase()}.jpg`, { type: 'image/jpeg' });
      upload.mutate({ type, file, onProgress: setProgress });
    } catch (err) {
      setComposing(false);
      setComposeError(err?.message || 'Could not combine the two photos. Please try again.');
    }
  }

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-ink font-semibold">{title}</h3>
          {description && <p className="text-muted text-xs mt-1">{description}</p>}
        </div>
        {meta && <Badge label={meta.label} variant={meta.variant} className="shrink-0" />}
      </div>

      {status === DOCUMENT_STATUSES.REJECTED && document?.rejectionReason && (
        <p className="text-red-600 text-xs">{document.rejectionReason}</p>
      )}

      <DocumentFilePreview document={document} />

      {canUpload && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <ShotPicker label="Front" file={front} onPick={setFront} onClear={() => setFront(null)} disabled={busy} />
            <ShotPicker label="Back" file={back} onPick={setBack} onClear={() => setBack(null)} disabled={busy} />
          </div>

          {composeError && <p role="alert" className="text-red-600 text-xs">{composeError}</p>}

          {busy ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Spinner size="md" label={composing ? 'Combining photos' : 'Uploading'} />
              <p className="text-muted text-xs">
                {composing ? 'Combining your photos…' : `${progress}%`}
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
