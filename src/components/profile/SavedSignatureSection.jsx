import React, { useState } from 'react';
import { PenLine, Trash2, Save } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import SegmentedControl from '../ui/SegmentedControl';
import SignaturePad from '../payment/SignaturePad';
import { useSavedSignature, useSavedSignatureImage, useSaveSignature, useDeleteSignature } from '../../hooks/useSignature';
import { formatDate } from '../../lib/utils';

/**
 * Profile → **My signature**: the signature used to sign rental contracts with one click ("Sign with my saved
 * signature" — still the person's own action on each contract). Draw it or upload a photo of it, agreeing it can be
 * used to sign their contracts; replace it any time, or remove it (contracts already signed keep theirs).
 * See `hooks/useSignature.js`.
 */
export default function SavedSignatureSection() {
  const saved = useSavedSignature();
  const hasSaved = saved.data?.hasSavedSignature === true;
  const image = useSavedSignatureImage(hasSaved);
  const save = useSaveSignature();
  const remove = useDeleteSignature();
  const [editing, setEditing] = useState(false);
  const [how, setHow] = useState('draw');
  const [drawn, setDrawn] = useState(null);
  const [file, setFile] = useState(null);
  const [consent, setConsent] = useState(false);

  if (saved.isError) return null; // the backend doesn't have saved signatures (older server)

  const value = how === 'draw' ? drawn : file;
  function submit() {
    save.mutate(value, {
      onSuccess: () => {
        setEditing(false);
        setDrawn(null);
        setFile(null);
        setConsent(false);
      },
    });
  }

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div>
        <h2 className="flex items-center gap-2 font-heading text-brand-white text-base font-semibold">
          <PenLine size={17} className="text-brand-gold" aria-hidden="true" /> My signature
        </h2>
        <p className="text-brand-grey text-sm mt-1">Save it once, then sign each rental contract with one click.</p>
      </div>

      {hasSaved && !editing && (
        <div className="flex flex-col gap-3">
          <div className="h-24 max-w-sm rounded-xl bg-white flex items-center justify-center overflow-hidden">
            {image.data ? <img src={image.data} alt="Your saved signature" className="max-h-20 object-contain" /> : <span className="text-xs text-slate-400">Your saved signature</span>}
          </div>
          {saved.data?.consentGivenAt && <p className="text-xs text-brand-grey">Saved {formatDate(saved.data.consentGivenAt)}.</p>}
          <div className="flex flex-wrap gap-3">
            <Button size="sm" onClick={() => setEditing(true)}>Replace</Button>
            <Button size="sm" variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
              {!remove.isPending && <Trash2 size={13} aria-hidden="true" />} Remove
            </Button>
          </div>
        </div>
      )}

      {(!hasSaved || editing) && (
        <div className="flex flex-col gap-4">
          <SegmentedControl
            label="How do you want to add it?"
            size="sm"
            options={[{ value: 'draw', label: 'Draw it' }, { value: 'upload', label: 'Upload a photo' }]}
            value={how}
            onChange={setHow}
          />
          {how === 'draw' ? (
            <SignaturePad onChange={setDrawn} label="Your signature" />
          ) : (
            <label className="flex flex-col gap-1 text-sm font-medium text-brand-white">
              A clear photo of your signature, on white paper
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-sm text-brand-grey file:mr-3 file:rounded-full file:border file:border-brand-gold file:bg-transparent file:px-4 file:py-1.5 file:text-brand-gold file:font-semibold"
              />
            </label>
          )}
          <Checkbox
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            label="This is my signature, and I agree it can be used when I choose to sign my rental contracts on Ramellian Executive Travels."
          />
          <div className="flex flex-wrap gap-3">
            <Button disabled={!value || !consent} loading={save.isPending} onClick={submit}>
              {!save.isPending && <Save size={15} aria-hidden="true" />} Save signature
            </Button>
            {editing && <Button onClick={() => setEditing(false)}>Cancel</Button>}
          </div>
        </div>
      )}
    </Card>
  );
}
