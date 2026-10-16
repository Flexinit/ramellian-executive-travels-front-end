import React, { useState } from 'react';
import { Check } from 'lucide-react';
import Button from '../ui/Button';
import SignaturePad from '../payment/SignaturePad';
import { useSavedSignature, useSavedSignatureImage } from '../../hooks/useSignature';
import { apiErrorMessage } from '../../lib/apiError';

/**
 * Where a party signs inside the contract's Signatures section — for the renter or the owner. With a saved
 * signature (Profile → My signature): its preview and **Sign with my saved signature** (one click — still their
 * own action, for this contract), or **Draw a new one** instead. Without one: the pad to draw on and, optionally,
 * **Save this signature for my next contracts**.
 *
 * @param {function} onSign — gets `{ signature?, useSaved, saveAsProfile }`
 * @param {boolean} [signing]
 * @param {Error} [error]
 * @param {boolean} [offerSave] — offer to keep a drawn signature (the renter's sign endpoint supports it)
 */
export default function ContractSigningPlace({ onSign, signing = false, error, offerSave = false }) {
  const saved = useSavedSignature();
  const hasSaved = saved.data?.hasSavedSignature === true;
  const image = useSavedSignatureImage(hasSaved);
  const [drawNew, setDrawNew] = useState(false);
  const [signature, setSignature] = useState(null);
  const [keep, setKeep] = useState(false);

  const errorLine = error && (
    <p role="alert" className="text-[13px] text-red-600">{apiErrorMessage(error, "Your signature couldn't be saved.")}</p>
  );

  if (hasSaved && !drawNew) {
    return (
      <div className="flex flex-col gap-2 mt-1">
        <div className="h-20 rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden">
          {image.data ? <img src={image.data} alt="Your saved signature" className="max-h-16 object-contain" /> : <span className="text-[12px] text-slate-400">Your saved signature</span>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="navy" loading={signing} onClick={() => onSign({ useSaved: true })}>
            {!signing && <Check size={16} aria-hidden="true" />} Sign with my saved signature
          </Button>
          <button type="button" onClick={() => setDrawNew(true)} className="text-[13px] font-semibold text-[#8a6d1f] hover:underline focus-ring rounded">
            Draw a new one
          </button>
        </div>
        {errorLine}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-1">
      <SignaturePad tone="paper" label="Sign here" onChange={setSignature} />
      {offerSave && (
        <label className="flex items-center gap-2 text-[13px] text-slate-600 cursor-pointer">
          <input type="checkbox" className="h-4 w-4 accent-[#C9A84C]" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
          Save this signature for my next contracts
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="navy" disabled={!signature} loading={signing} onClick={() => onSign({ signature, useSaved: false, saveAsProfile: offerSave && keep })}>
          {!signing && <Check size={16} aria-hidden="true" />} Submit signature
        </Button>
        {hasSaved && (
          <button type="button" onClick={() => setDrawNew(false)} className="text-[13px] font-semibold text-[#8a6d1f] hover:underline focus-ring rounded">
            Use my saved signature
          </button>
        )}
      </div>
      {errorLine}
    </div>
  );
}
