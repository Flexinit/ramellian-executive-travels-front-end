import { useEffect, useState } from 'react';

/**
 * Whether the CSS media query `query` matches right now, kept up to date as the window is resized. For layout
 * that can't be done with CSS alone — e.g. rendering one component in a different place at a breakpoint
 * instead of rendering it twice. Where `matchMedia` doesn't exist (tests' jsdom), returns `fallback`.
 * @param {string} query — e.g. '(min-width: 1024px)'
 * @param {boolean} [fallback]
 */
export function useMediaQuery(query, fallback = false) {
  const supported = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const [matches, setMatches] = useState(() => (supported ? window.matchMedia(query).matches : fallback));

  useEffect(() => {
    if (!supported) return undefined;
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener?.('change', update);
    return () => list.removeEventListener?.('change', update);
  }, [query, supported]);

  return matches;
}
