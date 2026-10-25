import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { RotateCcw } from 'lucide-react';

/**
 * Captures a signature as a base64 PNG. `onChange` fires with the trimmed
 * data URL, or `null` when cleared/empty — the caller (SignaturePage)
 * disables Submit while it's null.
 *
 * @param {function} onChange
 * @param {'dark'|'paper'} [tone] — `paper` when it sits on the white contract page (dark label, light frame)
 * @param {string} [label]
 */
export default function SignaturePad({ onChange, tone = 'dark', label = 'Your Signature' }) {
  const paper = tone === 'paper';
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
      <span className={`text-sm font-medium ${paper ? 'text-slate-700' : 'text-ink'}`} id="signature-label">
        {label}
      </span>
      <div className={`rounded-xl border bg-white overflow-hidden ${paper ? 'border-slate-300 border-dashed' : 'border-ink/10'}`}>
        <SignatureCanvas
          ref={sigRef}
          penColor="#16213E"
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
        className={`self-start inline-flex items-center gap-1.5 text-xs ${paper ? 'text-slate-500 hover:text-slate-900' : 'text-muted hover:text-ink'} disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-ring rounded-md py-2 -my-2`}
      >
        <RotateCcw size={12} aria-hidden="true" />
        Clear
      </button>
    </div>
  );
}
