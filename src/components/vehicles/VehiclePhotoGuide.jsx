import React, { useEffect, useState } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';

import { PHOTO_ANGLES } from '../../lib/vehiclePhotos';

// Re-exported for existing importers; the definitions live in lib/vehiclePhotos.js.
export { PHOTO_ANGLES, angleFileName } from '../../lib/vehiclePhotos';

/** Top-down car outline with the side/area to photograph highlighted. */
function AngleIcon({ angle }) {
  const accent = '#16213E';
  const line = 'currentColor';
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true" className="text-muted shrink-0">
      <rect x="14" y="6" width="20" height="36" rx="7" fill="none" stroke={line} strokeWidth="1.5" />
      <rect x="17" y="17" width="14" height="14" rx="3" fill={angle === 'interior' || angle === 'interior-back' ? accent : 'none'} fillOpacity={0.35} stroke={line} strokeWidth="1" />
      {angle === 'interior-back' && <rect x="17" y="24" width="14" height="7" rx="2" fill={accent} />}
      {angle === 'interior' && <rect x="17" y="17" width="14" height="7" rx="2" fill={accent} />}
      {angle === 'front' && <path d="M17 6.75 H31" stroke={accent} strokeWidth="4" strokeLinecap="round" />}
      {angle === 'back' && <path d="M17 41.25 H31" stroke={accent} strokeWidth="4" strokeLinecap="round" />}
      {angle === 'left' && <path d="M14.75 13 V35" stroke={accent} strokeWidth="4" strokeLinecap="round" />}
      {angle === 'right' && <path d="M33.25 13 V35" stroke={accent} strokeWidth="4" strokeLinecap="round" />}
      <path d="M24 3 L21.5 7 H26.5 Z" fill={line} />
    </svg>
  );
}

function Preview({ file, alt }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return undefined;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL?.(objectUrl);
  }, [file]);

  if (!url) return <Camera size={22} className="text-accent" aria-hidden="true" />;
  return <img src={url} alt={alt} className="w-full h-full object-cover" />;
}

/**
 * Guided vehicle photo capture: one slot per angle (front, back, left, right,
 * interior…), each with a tip on how to frame it and a diagram of which side
 * it is, plus a progress count and room for any extra shots. Purely a
 * picker — the parent owns the files and uploads them after the vehicle is
 * created (`POST /vehicles/{id}/photos` takes only a `file`, so there's no
 * server-side angle field; the angle is remembered locally with the returned
 * URL — see lib/vehiclePhotos.js).
 *
 * @param {Record<string, File>} slots — chosen file per angle key
 * @param {(key: string, file: File|null) => void} onSlotChange
 * @param {File[]} extras — additional photos beyond the guided angles
 * @param {(files: File[]) => void} onExtrasChange
 */
export default function VehiclePhotoGuide({ slots, onSlotChange, extras, onExtrasChange }) {
  const added = PHOTO_ANGLES.filter((a) => slots[a.key]).length;

  function handleExtras(e) {
    onExtrasChange([...extras, ...Array.from(e.target.files || [])]);
    e.target.value = '';
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium text-ink">
        Photos <span className="text-muted font-normal">(optional, but renters book with more confidence when they can see every angle)</span>
      </legend>

      <p className="text-xs text-muted">
        Take them in daylight with the car clean, in landscape, and keep the whole car in frame.{' '}
        <span className="text-ink font-medium" aria-live="polite">
          {added} of {PHOTO_ANGLES.length} angles added.
        </span>
      </p>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PHOTO_ANGLES.map((angle) => {
          const file = slots[angle.key];
          return (
            <li key={angle.key} className="rounded-xl border border-ink/10 bg-ink/5 p-3 flex gap-3">
              <div className="flex flex-col items-center gap-1.5">
                {file ? (
                  <div className="w-[88px] h-[66px] rounded-lg overflow-hidden bg-ink/5 flex items-center justify-center">
                    <Preview file={file} alt={`${angle.label} preview`} />
                  </div>
                ) : (
                  <AngleIcon angle={angle.key} />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <p className="text-sm font-semibold text-ink">{angle.label}</p>
                <p className="text-xs text-muted">{angle.tip}</p>
                {file ? (
                  <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
                    <span className="truncate max-w-[140px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => onSlotChange(angle.key, null)}
                      aria-label={`Remove ${angle.label} photo`}
                      className="p-0.5 rounded-full text-muted hover:text-ink hover:bg-ink/10 focus-ring"
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-1.5 w-fit text-xs font-semibold text-accent hover:text-accent-hover cursor-pointer rounded-md px-1 focus-within:ring-2 focus-within:ring-accent">
                    <Camera size={13} aria-hidden="true" />
                    Add {angle.label} photo
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        onSlotChange(angle.key, e.target.files?.[0] || null);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2">
        <label className="inline-flex items-center gap-2 w-fit px-4 py-2 rounded-lg border border-dashed border-ink/20 text-muted text-sm cursor-pointer hover:border-accent/50 hover:text-ink transition-colors focus-within:ring-2 focus-within:ring-accent">
          <ImagePlus size={16} aria-hidden="true" />
          Add more photos
          <input type="file" accept="image/*" multiple className="sr-only" onChange={handleExtras} />
        </label>
        {extras.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {extras.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-ink/5 border border-ink/10 text-xs text-ink"
              >
                {file.name}
                <button
                  type="button"
                  onClick={() => onExtrasChange(extras.filter((_, idx) => idx !== i))}
                  aria-label={`Remove ${file.name}`}
                  className="p-0.5 rounded-full hover:bg-ink/10 focus-ring"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </fieldset>
  );
}
