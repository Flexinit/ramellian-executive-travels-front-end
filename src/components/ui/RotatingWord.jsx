import React, { useEffect, useState } from 'react';

/**
 * A word that playfully swaps itself for related ones every few seconds — each new word flips down into place
 * (the `word-flip-in` animation in index.css). The hero's "Executive Travel, Reimagined" uses it.
 *
 *  - The headline never jumps: the word sits in a box as wide as the longest of the words. The width is held by
 *    empty spans whose words are drawn by CSS (`content: attr(data-word)`), not written in the page — so the heading's
 *    text is only ever "Executive Travel, <the word showing>", for search engines and screen readers alike.
 *  - A heading isn't a live region, so screen readers don't announce each change; they read whichever word is
 *    showing when they reach it.
 *  - On a phone, where the word wraps onto its own line, it's centred in its box; beside the rest of the line it's
 *    left-aligned, so the space after the comma stays natural.
 *  - With "reduce motion" switched on (device setting) it stays on the first word and never moves.
 *
 * @param {string[]} words — the first is shown first (and is what the page starts with)
 * @param {number} [interval=2600] — milliseconds each word stays
 * @param {string} [className] — e.g. the word's colour
 */
export default function RotatingWord({ words, interval = 2600, className = '' }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length < 2) return undefined;
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => clearInterval(timer);
  }, [words.length, interval]);

  return (
    <span className={`inline-grid [perspective:600px] ${className}`}>
      {/* Width holders: each draws one of the words invisibly (CSS content), so the box fits the longest one. */}
      {words.map((w) => (
        <span key={w} aria-hidden="true" data-word={w} className="invisible col-start-1 row-start-1 before:content-[attr(data-word)]" />
      ))}
      <span key={index} className="col-start-1 row-start-1 text-left max-sm:text-center origin-top motion-safe:animate-[word-flip-in_650ms_cubic-bezier(0.34,1.56,0.64,1)_both]">
        {words[index]}
      </span>
    </span>
  );
}
