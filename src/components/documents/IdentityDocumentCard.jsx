import React from 'react';
import { FileCheck2, FileClock, FileX2 } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import ToggleChip from '../ui/ToggleChip';
import DocumentFilePreview from './DocumentFilePreview';
import ShotPicker from './ShotPicker';
import { DOCUMENT_STATUSES, DOCUMENT_TYPE_LABELS } from '../../lib/constants';
import { IDENTITY_KINDS, currentIdentityDocument } from '../../lib/identity';
import { useIdentityCapture } from '../../hooks/useIdentityCapture';

const STATUS_META = {
  [DOCUMENT_STATUSES.APPROVED]: { variant: 'success', label: 'Approved' },
  [DOCUMENT_STATUSES.PENDING]: { variant: 'warning', label: 'Pending Review' },
  [DOCUMENT_STATUSES.REJECTED]: { variant: 'danger', label: 'Rejected' },
};

/** Picks National ID or Passport. */
export function IdentityKindChooser({ kind, onChoose, disabled = false }) {
  return (
    <div role="group" aria-label="Identity document" className="flex gap-2">
      {Object.values(IDENTITY_KINDS).map((k) => (
        <ToggleChip key={k.type} size="md" active={kind === k.type} disabled={disabled} onClick={() => onChoose(k.type)}>
          {k.label}
        </ToggleChip>
      ))}
    </div>
  );
}

/** What the number read off the photo is — it can't be typed, only re-read from a clearer photo. */
export function IdentityNumberStatus({ spec, ocr }) {
  if (ocr.status === 'reading') {
    return (
      <p className="flex items-center gap-2 text-brand-grey text-xs">
        <Spinner size="sm" label="Reading" /> Reading your {spec.numberLabel.toLowerCase()} from the photo…
      </p>
    );
  }
  if (ocr.status === 'read') {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-brand-white">{spec.numberLabel}</span>
        <p className="text-brand-white text-sm font-mono tracking-wide" aria-label={spec.numberLabel}>{ocr.number}</p>
        <p className="text-brand-grey text-xs">Read from your photo. If it's wrong, retake a clearer photo.</p>
      </div>
    );
  }
  if (ocr.status === 'failed') {
    return (
      <p role="alert" className="text-red-400 text-xs">
        We couldn't read the {spec.numberLabel.toLowerCase()} from that photo. Retake it flat, well lit and in focus,
        with the whole {spec.label === 'Passport' ? 'photo page' : 'card'} in the frame.
      </p>
    );
  }
  return null;
}

/**
 * The account's identity document — a National ID or a Passport, whichever the person has (one is
 * enough) — with selfies of them holding it. The ID / passport number is read off the photo and locked.
 * Shows the one already uploaded, and lets them upload (or re-upload, once rejected).
 *
 * @param {Array<{type: string, status: string, rejectionReason?: string}>} [documents]
 * @param {string} [currentIdNumber]
 */
export default function IdentityDocumentCard({ documents = [], currentIdNumber = '' }) {
  const existing = currentIdentityDocument(documents);
  const status = existing?.status;
  const meta = status && STATUS_META[status];
  const canUpload = !status || status === DOCUMENT_STATUSES.REJECTED;
  const capture = useIdentityCapture(currentIdNumber);
  const { spec, shots, ocr, busy } = capture;
  const StatusIcon = status === DOCUMENT_STATUSES.APPROVED ? FileCheck2 : status === DOCUMENT_STATUSES.REJECTED ? FileX2 : FileClock;

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-brand-white font-semibold">Identity Document</h3>
          <p className="text-brand-grey text-xs mt-1">
            Required — a National ID or a Passport, whichever you have (one is enough), plus a selfie holding it so we
            know it's yours.
          </p>
        </div>
        {meta && <Badge label={meta.label} variant={meta.variant} className="shrink-0" />}
      </div>

      {existing && (
        <p className="flex items-center gap-2 text-brand-grey text-xs">
          <StatusIcon size={14} aria-hidden="true" /> {DOCUMENT_TYPE_LABELS[existing.type]} uploaded
        </p>
      )}
      {status === DOCUMENT_STATUSES.REJECTED && existing?.rejectionReason && (
        <p className="text-red-400 text-xs">{existing.rejectionReason}</p>
      )}

      <DocumentFilePreview document={existing} />

      {canUpload && (
        <div className="flex flex-col gap-3">
          <IdentityKindChooser kind={capture.kind} onChoose={capture.chooseKind} disabled={busy} />

          <div className="grid grid-cols-2 gap-3">
            {spec.shots.map((shot) => (
              <ShotPicker
                key={`${capture.kind}-${shot.key}`}
                label={shot.label}
                selfie={shot.selfie}
                file={shots[shot.key]}
                onPick={(file) => file && capture.setShot(shot.key, file)}
                onClear={() => capture.setShot(shot.key, null)}
                disabled={busy}
              />
            ))}
          </div>

          <IdentityNumberStatus spec={spec} ocr={ocr} />
          {capture.error && <p role="alert" className="text-red-400 text-xs">{capture.error}</p>}

          {busy ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Spinner size="md" label="Uploading" />
              <p className="text-brand-grey text-xs">
                {capture.phase === 'composing' ? 'Combining your photos…' : capture.phase === 'saving' ? `Saving your ${spec.numberLabel.toLowerCase()}…` : `${capture.progress}%`}
              </p>
            </div>
          ) : (
            <Button size="sm" disabled={!capture.complete} onClick={capture.submit} className="self-start">
              Submit {spec.label}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
