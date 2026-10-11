import React from 'react';

/**
 * The full-page photo backdrop for the sign-in pages (login, registration): one of the
 * destination photos the site already uses, under a dark scrim so the card on top stays easy to
 * read, with the content centred over it. The photo is decoration only, so it is hidden from
 * screen readers.
 *
 * @param {string} image — URL of the photo (import one from `src/assets/destinations`)
 * @param {React.ReactNode} children — the card
 */
export default function AuthBackdrop({ image, children }) {
  return (
    <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-brand-dark px-4 py-12">
      <div aria-hidden="true" data-testid="auth-backdrop" className="absolute inset-0">
        <img src={image} alt="" decoding="async" className="w-full h-full object-cover" />
        {/* Dark scrim: keeps the card legible over any photo, and on-theme. */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/70 via-brand-dark/75 to-brand-dark/90" />
      </div>
      <div className="relative w-full flex justify-center">{children}</div>
    </div>
  );
}
