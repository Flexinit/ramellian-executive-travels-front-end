import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Upload, CheckCircle2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { DOCUMENT_TYPES, DOCUMENT_STATUSES } from '../../lib/constants';
import { useAuthStore } from '../../store/authStore';
import { useUploadDocument } from '../../hooks/useDocuments';
import { useUpdateProfile } from '../../hooks/useProfile';
import { composeFrontBack } from '../../lib/composeFrontBack';

const DOC_LABELS = {
  [DOCUMENT_TYPES.NATIONAL_ID]: 'National ID',
  [DOCUMENT_TYPES.DRIVING_LICENSE]: 'Driving Licence',
};

function canUploadDoc(doc) {
  return !doc?.status || doc.status === DOCUMENT_STATUSES.REJECTED;
}

/** One side's photo picker — the sole focus of its step, so it's shown large rather than as a small thumbnail. */
function PhotoStep({ file, onPick }) {
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
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onPick(e.dataTransfer.files?.[0]);
      }}
      className={`rounded-xl border-2 border-dashed h-48 flex flex-col items-center justify-center gap-2 text-center transition-colors overflow-hidden ${
        dragOver ? 'border-brand-gold bg-brand-gold/5' : 'border-white/15 hover:border-brand-gold/40'
      }`}
    >
      {url ? (
        <img src={url} alt="Selected photo" className="w-full h-full object-contain" />
      ) : (
        <>
          <Upload size={22} className="text-brand-gold" aria-hidden="true" />
          <p className="text-brand-white text-sm font-medium">Drop a photo, or browse</p>
          <p className="text-brand-grey text-xs">JPG or PNG</p>
        </>
      )}
      <label className="mt-1 text-xs font-semibold text-brand-gold hover:text-brand-gold-light cursor-pointer focus-within:ring-2 focus-within:ring-brand-gold rounded-md px-1">
        {url ? 'Choose a different photo' : 'Choose photo'}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="sr-only"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
      </label>
    </div>
  );
}

/**
 * Offered at checkout when the renter doesn't yet have the approved documents a booking needs — an optional
 * shortcut to upload right there, not a gate: checkout itself no longer waits on this (confirmed live
 * 2026-10-06 — see `BookingCheckoutPage`'s own "Upload now" notice and `BookingWarningsModal`, shown again
 * after the booking is made). Still used as a genuine fallback if the backend ever does refuse outright
 * (the 422/403 branch in `BookingCheckoutPage`). Walks through what's needed one focused thing at a time —
 * ID number, then the front photo, then the back, then the same for a driving licence if the booking is
 * self-drive — rather than one long form to scroll through. `missing` (from `missingBookingDocuments`, or
 * the backend's own 422/403 message) is shown as a fallback when there's nothing left for the renter to
 * actually do here (already pending, or a server-side reason the portal can't otherwise explain).
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {string[]} missing
 * @param {Array<{type: string, status: string, rejectionReason?: string}>} [documents]
 * @param {boolean} [needsLicense] — whether the selection includes a self-drive booking
 */
export default function DocumentGateModal({ isOpen, onClose, missing = [], documents = [], needsLicense = false }) {
  const currentIdNumber = useAuthStore((s) => s.user?.idNumber) || '';
  const upload = useUploadDocument();
  const updateProfile = useUpdateProfile();

  const [docs, setDocs] = useState([]); // frozen for the life of this open — see the reset effect below
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState({}); // { [type]: { idNumber, front, back } }
  const [phase, setPhase] = useState('collect'); // 'collect' | 'uploading' | 'error'
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [progress, setProgress] = useState(0);

  // Freshly worked out each time the modal opens, then held steady — a document that finishes uploading
  // mid-flow must not resize the step list out from under whichever step the renter is currently on.
  useEffect(() => {
    if (!isOpen) return;
    const wanted = [
      { type: DOCUMENT_TYPES.NATIONAL_ID, requireIdNumber: true },
      ...(needsLicense ? [{ type: DOCUMENT_TYPES.DRIVING_LICENSE }] : []),
    ].filter((d) => canUploadDoc(documents.find((doc) => doc.type === d.type)));
    setDocs(wanted);
    setStepIndex(0);
    setValues({});
    setPhase('collect');
    setError('');
    setFieldError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const steps = docs.flatMap((doc) => [
    ...(doc.requireIdNumber ? [{ kind: 'idNumber', doc }] : []),
    { kind: 'photo', doc, side: 'front' },
    { kind: 'photo', doc, side: 'back' },
  ]);
  const step = steps[stepIndex];
  const done = docs.length === 0 || stepIndex >= steps.length;

  function valueFor(type) {
    return values[type] || { idNumber: currentIdNumber, front: null, back: null };
  }

  function setValue(type, patch) {
    setValues((v) => ({ ...v, [type]: { ...valueFor(type), ...patch } }));
  }

  async function submit(doc) {
    setPhase('uploading');
    setError('');
    try {
      const v = valueFor(doc.type);
      const combined = await composeFrontBack(v.front, v.back);
      const file = new File([combined], `${doc.type.toLowerCase()}.jpg`, { type: 'image/jpeg' });
      if (doc.requireIdNumber && v.idNumber.trim() !== currentIdNumber) {
        await updateProfile.mutateAsync({ idNumber: v.idNumber.trim() });
      }
      setProgress(0);
      await upload.mutateAsync({ type: doc.type, file, onProgress: setProgress });
      setPhase('collect');
      setStepIndex((i) => i + 1);
    } catch (err) {
      setPhase('error');
      setError(err?.message || 'Could not upload this document. Please try again.');
    }
  }

  function handleContinue() {
    if (!step) return;
    if (step.kind === 'idNumber') {
      const id = valueFor(step.doc.type).idNumber.trim();
      if (!id) {
        setFieldError('Enter your ID number to continue.');
        return;
      }
      setFieldError('');
      setStepIndex((i) => i + 1);
      return;
    }
    // photo step
    const v = valueFor(step.doc.type);
    if (!v[step.side]) {
      setFieldError(`Choose a photo of the ${step.side} to continue.`);
      return;
    }
    setFieldError('');
    if (step.side === 'back') {
      submit(step.doc);
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function handleBack() {
    setFieldError('');
    setStepIndex((i) => Math.max(0, i - 1));
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Verification Required" size="md">
      <div className="flex flex-col gap-5">
        {stepIndex === 0 && phase === 'collect' && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded-full bg-brand-gold/10 flex items-center justify-center">
              <ShieldCheck size={18} className="text-brand-gold" aria-hidden="true" />
            </div>
            <p className="text-sm text-brand-grey leading-relaxed">
              We verify a renter's identity on every booking — it protects you and the vehicle's owner if
              anything goes wrong during the rental.
              {needsLicense && " Since you chose self-drive, we'll also need your driving licence."}
              {' '}Approval usually takes a few hours; you can carry on browsing meanwhile.
            </p>
          </div>
        )}

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            {docs.length > 0 ? (
              <>
                <CheckCircle2 size={32} className="text-emerald-400" aria-hidden="true" />
                <p className="text-brand-white text-sm font-medium">Uploaded — now pending review.</p>
                <p className="text-brand-grey text-xs">
                  We'll review it shortly (usually a few hours). Come back and pay once it's approved — nothing here is lost.
                </p>
              </>
            ) : missing.length > 0 ? (
              <ul className="flex flex-col gap-1.5 text-sm text-brand-white pl-1 text-left self-stretch">
                {missing.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-brand-gold shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-brand-grey text-sm">Nothing left to upload right now.</p>
            )}
            <Button onClick={onClose} className="mt-1">Close</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {steps.map((s, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className={`h-1.5 flex-1 rounded-full ${i < stepIndex ? 'bg-brand-gold' : i === stepIndex ? 'bg-brand-gold/50' : 'bg-white/10'}`}
                />
              ))}
            </div>
            <p className="text-brand-grey text-xs">
              Step {stepIndex + 1} of {steps.length} — {DOC_LABELS[step.doc.type]}
            </p>

            {phase === 'uploading' ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <Spinner size="lg" label="Uploading" />
                <p className="text-brand-grey text-xs">{progress > 0 ? `Uploading… ${progress}%` : 'Combining your photos…'}</p>
              </div>
            ) : (
              <>
                {step.kind === 'idNumber' ? (
                  <div className="flex flex-col gap-2">
                    <label htmlFor="gate-id-number" className="text-sm font-medium text-brand-white">
                      What's your ID number?
                    </label>
                    <input
                      id="gate-id-number"
                      type="text"
                      autoFocus
                      value={valueFor(step.doc.type).idNumber}
                      onChange={(e) => {
                        setValue(step.doc.type, { idNumber: e.target.value });
                        if (fieldError) setFieldError('');
                      }}
                      placeholder="e.g. 12345678"
                      className={`w-full rounded-lg bg-white/5 border px-3 py-2.5 text-brand-white placeholder-brand-grey text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent transition ${fieldError ? 'border-red-500/50' : 'border-white/10 hover:border-brand-gold/50'}`}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-brand-white">
                      Photo of the {step.side} of your {DOC_LABELS[step.doc.type]}
                    </p>
                    <PhotoStep
                      file={valueFor(step.doc.type)[step.side]}
                      onPick={(file) => {
                        if (!file) return;
                        setValue(step.doc.type, { [step.side]: file });
                        if (fieldError) setFieldError('');
                      }}
                    />
                  </div>
                )}
                {fieldError && <p role="alert" className="text-red-400 text-xs">{fieldError}</p>}
                {phase === 'error' && error && <p role="alert" className="text-red-400 text-xs">{error}</p>}
              </>
            )}

            {phase !== 'uploading' && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <Button onClick={handleBack} disabled={stepIndex === 0}>Back</Button>
                <Button onClick={handleContinue}>
                  {step.kind === 'photo' && step.side === 'back' ? 'Upload' : 'Continue'}
                </Button>
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <Link to="/dashboard/documents" className="text-brand-gold text-xs font-semibold hover:text-brand-gold-light transition-colors focus-ring rounded-md">
            Manage all my documents
          </Link>
          {!done && <button type="button" onClick={onClose} className="text-brand-grey text-xs hover:text-brand-white transition-colors focus-ring rounded-md">Not now</button>}
        </div>
      </div>
    </Modal>
  );
}
