import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PanelRightOpen, X } from 'lucide-react';
import Button from './Button';

/**
 * Accessible, focus-trapped card that slides in from the right edge of the screen instead of popping up
 * centered — used where the rest of the page (a booking in progress, a vehicle being viewed) should stay
 * visible behind a light overlay rather than being covered by a full backdrop. Sized to its content (capped
 * at the viewport height, scrolling on its own past that) rather than stretched edge-to-edge, so — like
 * `Modal` — it reads as a floating card, just docked to the right instead of centered.
 *
 * Dismissing it (the X, Escape, or clicking outside) leaves a small tab docked to the right edge instead of
 * just vanishing, labelled "Continue: {title}" so it's clear what it reopens rather than having to go find
 * the button that first opened it — the form itself starts fresh again, same as opening it the first time.
 * Like `Modal`, it's rendered into `document.body`: opened from inside a frosted-glass card (`backdrop-blur`
 * makes the card the box `fixed` is measured against), it was otherwise squeezed into that card — Log In
 * opened from the vehicle page's booking panel showed inside the panel.
 * The tab only appears for a dismissal like that; when the caller closes the drawer itself because the job is
 * done (e.g. signed in successfully), `isOpen` just goes false with no tab left behind.
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {function} [onReopen] — called when the restore tab is clicked, after a dismissal; omit to skip the
 *   tab entirely and close for good like before (needs the same function the caller used to open the drawer)
 * @param {string} title
 * @param {React.ReactNode} children
 * @param {string} size — 'sm' | 'md' | 'lg' | 'xl'
 */
export default function Drawer({ isOpen, onClose, onReopen, title, children, size = 'md' }) {
  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);
  const [entered, setEntered] = useState(false);
  const [justDismissed, setJustDismissed] = useState(false);

  // Slide the panel in on the next frame after mount, rather than already in place, so the
  // transform transition actually has something to animate. Opening again (including from the
  // restore tab) always starts from a clean "not dismissed" state.
  useEffect(() => {
    if (isOpen) {
      setJustDismissed(false);
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
    return undefined;
  }, [isOpen]);

  // Focus close button when drawer opens — unless focus is already inside it (a field the
  // person has started typing in), which must not be yanked away.
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (!panelRef.current?.contains(document.activeElement)) closeBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  // A dismissal (X, Escape, clicking outside) — as opposed to the caller closing the drawer itself once its
  // job is done — leaves the restore tab behind instead of losing whatever was open for good.
  function handleDismiss() {
    setJustDismissed(true);
    onClose();
  }

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === 'Escape') handleDismiss();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onClose]);

  if (!isOpen) {
    if (justDismissed && onReopen) {
      return createPortal(
        <Button
          size="sm"
          onClick={() => {
            setJustDismissed(false);
            onReopen();
          }}
          className="fixed right-4 top-1/2 z-50 -translate-y-1/2 bg-surface shadow-xl"
        >
          <PanelRightOpen size={16} aria-hidden="true" /> Continue: {title}
        </Button>,
        document.body
      );
    }
    return null;
  }

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-end p-4 sm:p-8">
      {/* Light, unblurred overlay — dims the page just enough to show the drawer has focus without
          hiding what's behind it (a booking in progress, a vehicle being viewed). It sits on top of
          the rest of the backdrop, so the click-to-close handler lives here, not on the container
          behind it — clicking anywhere in the dimmed area closes the drawer. */}
      <div
        data-testid="drawer-backdrop"
        onClick={handleDismiss}
        className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${entered ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* Lightly frosted: mostly solid, so a busy page behind (a booking form full of labels and buttons)
          never shows through strongly enough to compete with the panel's own text — only a hint of it,
          blurred. The overlay behind also softens the page slightly for the same reason. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative flex max-h-full w-full flex-col ${sizes[size]} bg-surface/90 backdrop-blur-xl border border-ink/15 rounded-2xl shadow-2xl transition-transform duration-300 ease-out ${entered ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-ink/10">
          <h2 id="drawer-title" className="font-heading text-lg font-semibold text-ink">
            {title}
          </h2>
          <button
            ref={closeBtnRef}
            onClick={handleDismiss}
            aria-label="Close"
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-ink/10 transition focus-ring"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — scrolls on its own when the content is taller than the screen, so the header and Close button stay put */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
