import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Accessible focus-trapped modal dialog.
 * Matches otto.rentals' overlay panel style. Rendered into `document.body`, so it always covers the whole
 * screen: opened from inside a frosted-glass card (`backdrop-blur` makes the card the box `fixed` is measured
 * against), it was otherwise squeezed into that card — e.g. Log In inside the vehicle page's booking panel.
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {string} title
 * @param {React.ReactNode} children
 * @param {string} size — 'sm' | 'md' | 'lg' | 'xl'
 * @param {boolean} [dismissible=true] — false: no Close button, and Escape / clicking outside do nothing — for a
 *   choice that has to be made (logging in again after the session ended: ReauthModal)
 */
export default function Modal({ isOpen, onClose, title, children, size = 'md', dismissible = true }) {
  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);

  // Focus close button when modal opens — unless focus is already inside the dialog (a field the
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

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === 'Escape' && dismissible) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, dismissible]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget && dismissible) onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      data-testid="modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative flex w-full max-h-[calc(100dvh-2rem)] flex-col ${sizes[size]} bg-surface border border-ink/10 rounded-2xl shadow-2xl`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-ink/10">
          <h2 id="modal-title" className="font-heading text-lg font-semibold text-ink">
            {title}
          </h2>
          {dismissible && (
            <button
              ref={closeBtnRef}
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-ink/10 transition focus-ring"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Body — scrolls on its own when the content is taller than the screen, so the header and Close button stay put */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
