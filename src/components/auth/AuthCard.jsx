import React from 'react';

/**
 * The card on the sign-in pages (log in, create account, forgot password) — transparent dark glass over the
 * AuthBackdrop photo: a light Ramellian-navy tint with a strong blur, so the photo shows through, and white text on it.
 * The fields and the white buttons stay solid white with dark text. The colour switch for everything inside is in
 * index.css (`.auth-glass`), so the shared Input, Checkbox, Divider… need no special version. One component, so all
 * the sign-in pages look the same.
 *
 * @param {string} [className] — layout only
 */
export default function AuthCard({ children, className = '' }) {
  return (
    <div
      className={`auth-glass flex flex-col gap-6 rounded-card border border-white/20 bg-brand-navy/30 p-6 shadow-lift backdrop-blur-xl sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}
