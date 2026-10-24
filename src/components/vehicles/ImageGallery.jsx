import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import GenericVehiclePlaceholder from './GenericVehiclePlaceholder';
import AuthImage from './AuthImage';

/**
 * Main image + thumbnail strip with keyboard (arrow key) navigation.
 *
 * @param {Array<{url: string, alt?: string}|string>} photos
 * @param {string} alt — fallback alt text (e.g. the vehicle model)
 * @param {'STANDARD'|'EXECUTIVE'} [tier] — picks the placeholder silhouette when there are no photos
 */
export default function ImageGallery({ photos = [], alt = 'Vehicle photo', tier }) {
  const [index, setIndex] = useState(0);
  const images = photos.map((p) => (typeof p === 'string' ? { url: p, alt } : { alt, ...p }));

  function go(delta) {
    if (images.length === 0) return;
    setIndex((i) => (i + delta + images.length) % images.length);
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    }
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="w-full aspect-[16/10] max-h-[55vh] rounded-card overflow-hidden bg-subtle">
          <GenericVehiclePlaceholder tier={tier} />
        </div>
        <p className="text-muted text-xs text-center">Photos coming soon for this vehicle.</p>
      </div>
    );
  }

  const current = images[index];

  return (
    <div className="flex flex-col gap-3">
      {/* Capped at 55% of the screen's height: at the full 16:10 ratio a wide column made the photo taller than
          most screens, pushing the vehicle's name and details out of view. */}
      <div
        role="group"
        aria-label="Vehicle photo gallery"
        aria-roledescription="carousel"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="relative w-full aspect-[16/10] max-h-[55vh] rounded-card overflow-hidden bg-subtle focus-ring"
      >
        {/*
          No `srcSet` here: the backend serves one URL per photo with no
          documented width variants (FRONTEND_INTEGRATION.md §2 only
          mentions a single vehicle photo endpoint) — a fabricated `srcSet`
          would just 404. This is the gallery's hero image, so it loads
          eagerly rather than lazily (it's the vehicle detail page's LCP
          candidate).
        */}
        <AuthImage
          src={current.url}
          alt={current.alt || `${alt} — image ${index + 1} of ${images.length}`}
          className="w-full h-full object-cover"
          loading="eager"
          decoding="async"
          fallback={<GenericVehiclePlaceholder tier={tier} />}
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-surface/90 text-ink shadow-card hover:bg-surface transition-colors focus-ring"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-surface/90 text-ink shadow-card hover:bg-surface transition-colors focus-ring"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
            <span className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-surface/90 text-ink text-xs shadow-card">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Select a photo">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Photo ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors focus-ring ${
                i === index ? 'border-accent' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <AuthImage src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
