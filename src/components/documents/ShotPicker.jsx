import React, { useEffect, useState } from 'react';
import { Upload, Camera, X } from 'lucide-react';

const ACCEPTED_TYPES = 'image/jpeg,image/png';

/**
 * One photo's picker: a thumbnail once chosen, or a small dropzone. With `selfie`, a phone opens its front
 * camera straight away (a computer still gets the file picker).
 *
 * @param {string} label
 * @param {File} [file]
 * @param {function} onPick — gets the chosen File
 * @param {function} onClear
 * @param {boolean} [disabled]
 * @param {boolean} [selfie]
 */
export default function ShotPicker({ label, file, onPick, onClear, disabled = false, selfie = false }) {
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

  const Icon = selfie ? Camera : Upload;

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
          <Icon size={18} className="text-brand-gold" aria-hidden="true" />
          <label className="text-xs font-semibold text-brand-gold hover:text-brand-gold-light cursor-pointer focus-within:ring-2 focus-within:ring-brand-gold rounded-md px-1">
            {selfie ? 'Take selfie' : 'Choose photo'}
            <input
              type="file"
              accept={ACCEPTED_TYPES}
              capture={selfie ? 'user' : undefined}
              aria-label={label}
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
