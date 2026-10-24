import React, { useEffect, useState } from 'react';
import { Upload, Camera, X } from 'lucide-react';
import WebcamCapture, { prefersWebcamWindow } from '../ui/WebcamCapture';

const ACCEPTED_TYPES = 'image/jpeg,image/png';

/**
 * One photo's picker: a thumbnail once chosen, or a small dropzone. With `selfie`, a phone opens its front
 * camera straight away; a computer opens the camera window (`WebcamCapture`), with uploading a photo as the fallback.
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
  const [cameraOpen, setCameraOpen] = useState(false);
  const webcam = selfie && prefersWebcamWindow();

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
      <span className="text-xs font-semibold text-ink">{label}</span>
      {file ? (
        <div className="relative rounded-lg overflow-hidden border border-black/10">
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
            dragOver ? 'border-accent bg-accent/5' : 'border-black/15 hover:border-accent/40'
          }`}
        >
          <Icon size={18} className="text-accent" aria-hidden="true" />
          {webcam && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setCameraOpen(true)}
              className="text-xs font-semibold text-accent hover:text-accent-hover focus-ring rounded-md px-1"
            >
              Take selfie
            </button>
          )}
          <label className={`${webcam ? 'text-[11px] font-medium text-muted hover:text-ink' : 'text-xs font-semibold text-accent hover:text-accent-hover'} cursor-pointer focus-within:ring-2 focus-within:ring-accent rounded-md px-1`}>
            {webcam ? 'or upload a photo' : selfie ? 'Take selfie' : 'Choose photo'}
            <input
              type="file"
              accept={ACCEPTED_TYPES}
              capture={selfie && !webcam ? 'user' : undefined}
              aria-label={label}
              className="sr-only"
              disabled={disabled}
              onChange={(e) => onPick(e.target.files?.[0])}
            />
          </label>
        </div>
      )}
      {webcam && (
        <WebcamCapture isOpen={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={onPick} title={label} hint="Hold your ID or passport up next to your face, with the side being photographed facing the camera." />
      )}
    </div>
  );
}
