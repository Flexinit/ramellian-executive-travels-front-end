import React, { useEffect, useState } from 'react';

const LAST_PHOTO_KEY = 'ramellian.backdrop.last';

function readLast() {
  try {
    const stored = window.localStorage.getItem(LAST_PHOTO_KEY);
    const n = stored === null ? NaN : Number(stored); // nothing stored yet must not read as photo 0
    return Number.isInteger(n) ? n : -1;
  } catch {
    return -1;
  }
}

/**
 * Full-bleed photo backdrop for a public content page (About, Contact, Browse Vehicles, Vehicle Details) —
 * the same "photo + dark scrim" look `AuthBackdrop` gives the sign-in pages, sized to the page's own content
 * instead of a single viewport. Uses `background-attachment: fixed` (the `bg-fixed` class below) rather than
 * a `position: fixed` element, so the photo stays visually pinned as the page scrolls without that fixed
 * element needing to out-stack the sticky Navbar or the Footer — both sit outside this component's own box
 * entirely, so they're never in contention with it.
 *
 * Pass `images` instead of `image` for a backdrop that changes from visit to visit: each time the page is
 * opened it shows the next photo in the list, and that photo stays put for as long as the person is on the
 * page — nothing moves behind what they're reading. Which one was shown last is remembered in this browser
 * (localStorage; if that's blocked it just starts from the first).
 *
 * Wrap the page's whole return value in this (so the backdrop is behind every state the page can render, not
 * just the loaded one) rather than using it only around the final content.
 *
 * @param {string} [image] — URL of the photo (import one from `src/assets/destinations`)
 * @param {string[]} [images] — photos to take turns, one per visit (e.g. `lib/destinationPhotos.js`)
 * @param {React.ReactNode} children
 */
export default function PageBackdrop({ image, images, children }) {
  const photos = images?.length ? images : [image];
  // Chosen once when the page opens: the one after the last shown.
  const [index] = useState(() => (photos.length > 1 ? (readLast() + 1) % photos.length : 0));

  useEffect(() => {
    if (photos.length < 2) return;
    try {
      window.localStorage.setItem(LAST_PHOTO_KEY, String(index));
    } catch {
      // Storage blocked: the next visit starts from the first photo again.
    }
  }, [index, photos.length]);

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        data-testid="page-backdrop"
        className="absolute inset-0 bg-fixed bg-cover bg-center"
        style={{ backgroundImage: `url(${photos[index]})` }}
      />
      {/* Dark scrim: keeps page content legible over any photo, and on-theme — same gradient AuthBackdrop uses. */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-brand-dark/80 via-brand-dark/85 to-brand-dark/95" />
      <div className="relative">{children}</div>
    </div>
  );
}
