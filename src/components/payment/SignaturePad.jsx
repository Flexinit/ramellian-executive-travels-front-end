import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { RotateCcw } from 'lucide-react';

/**
 * Captures a signature as a base64 PNG. `onChange` fires with the trimmed
 * data URL, or `null` when cleared/empty — the caller (SignaturePage)
 * disables Submit while it's null.
 *
 * @param {function} onChange
 */
export default function SignaturePad({ onChange }) {
  const sigRef = useRef(null);
  const [empty, setEmpty] = useState(true);

  function handleEnd() {
    const isEmpty = sigRef.current?.isEmpty() ?? true;
    setEmpty(isEmpty);
    onChange?.(isEmpty ? null : sigRef.current.getTrimmedCanvas().toDataURL('image/png'));
  }

  function handleClear() {
    sigRef.current?.clear();
    setEmpty(true);
    onChange?.(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-brand-white" id="signature-label">
        Your Signature
      </span>
      <div className="rounded-xl border border-white/10 bg-white overflow-hidden">
        <SignatureCanvas
          ref={sigRef}
          penColor="#1A1A2E"
          onEnd={handleEnd}
          canvasProps={{
            role: 'img',
            'aria-labelledby': 'signature-label',
            className: 'w-full h-40 touch-none',
          }}
        />
      </div>
      <button
        type="button"
        onClick={handleClear}
        disabled={empty}
        className="self-start inline-flex items-center gap-1.5 text-xs text-brand-grey hover:text-brand-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-ring rounded-md"
      >
        <RotateCcw size={12} aria-hidden="true" />
        Clear
      </button>
    </div>
  );
}
