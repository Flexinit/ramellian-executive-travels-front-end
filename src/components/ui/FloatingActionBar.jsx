import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';

/**
 * A page's main action, floating along the bottom of the screen on phones and tablets (below `lg`), so a long page
 * doesn't have to be scrolled to the end to act ("Book now", "Continue to contract"…). From `lg` up the page's own
 * action column sticks beside the content, so the bar never shows there.
 *
 * It only shows while the page's own buttons (`watch`) are still further down the page: once they scroll into view
 * the bar steps aside, so the same buttons never appear twice. Signed in, it floats just above the phone tab bar.
 * While it shows, the chat button moves up out of its way (`uiStore.actionBarVisible`).
 *
 * @param {React.RefObject<HTMLElement>} watch — the page's own action area
 * @param {React.ReactNode} [summary] — a line on the left (usually the price)
 * @param {string} [label] — names the bar for screen readers (default "Quick actions")
 * @param {React.ReactNode} children — the buttons
 */
export default function FloatingActionBar({ watch, summary, label = 'Quick actions', children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const setActionBarVisible = useUiStore((s) => s.setActionBarVisible);
  const [ahead, setAhead] = useState(false);

  useEffect(() => {
    const el = watch?.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      // Shown only while the page's own action area is still below the screen — not once it's been scrolled past.
      setAhead(!entry.isIntersecting && entry.boundingClientRect.top > 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [watch]);

  useEffect(() => {
    // Only on screens where the bar can show (below lg) does the chat button need to move.
    const narrow = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 1023px)').matches;
    setActionBarVisible(ahead && narrow);
    return () => setActionBarVisible(false);
  }, [ahead, setActionBarVisible]);

  if (!ahead) return null;

  return createPortal(
    <div
      role="region"
      aria-label={label}
      className={`lg:hidden fixed inset-x-0 z-30 px-4 ${isAuthenticated ? 'bottom-[5.5rem] md:bottom-4' : 'bottom-4'}`}
    >
      <div className="mx-auto max-w-xl flex items-center gap-3 rounded-2xl border border-line bg-surface/95 backdrop-blur-md px-4 py-3 shadow-lift">
        {summary && <div className="min-w-0 flex-1 text-sm">{summary}</div>}
        <div className={`flex items-center gap-2 ${summary ? 'shrink-0' : 'flex-1 justify-end'}`}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
