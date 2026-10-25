import React, { useEffect, useState } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const SLIDE_MS = 6000;

/**
 * The layout of the sign-in pages (log in, create account, forgot password): the photo fills the whole screen under
 * the top bar — no white page around it — with the page's form on a frosted, see-through card. On a wide screen the
 * card sits on the right and a short welcome — white headline and a line under it — at the bottom left on a soft
 * Ramellian-navy fade. On a phone the
 * welcome comes first and the card under it, both over the photo. With several photos they take turns (slide bars
 * under the welcome); the photos are decoration, hidden from screen readers, and anyone whose device asks for reduced
 * motion keeps the first one.
 *
 * @param {string} [image] — one photo…
 * @param {string[]} [images] — …or several, shown in turn (see lib/authPhotos.js)
 * @param {React.ReactNode} [title] — the welcome headline
 * @param {React.ReactNode} [subtitle] — the line under it
 * @param {React.ReactNode} children — the card
 */
export default function AuthBackdrop({
  image,
  images,
  title = 'Executive travel, booked in minutes',
  subtitle = 'Chauffeured and self-drive cars — insured, on time, and paid for securely online.',
  children,
}) {
  const photos = images?.length ? images : [image];
  const [index, setIndex] = useState(0);
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)', false);

  useEffect(() => {
    if (photos.length < 2 || reduceMotion) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % photos.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [photos.length, reduceMotion]);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden lg:min-h-[calc(100vh-5rem)] lg:flex-row lg:items-center">
      <div aria-hidden="true" data-testid="auth-backdrop" className="absolute inset-0 bg-brand-navy">
        {photos.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            decoding="async"
            loading={i === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        {/* A soft navy fade: across the top on a phone (behind the welcome); on a wide screen up from the bottom (behind
            the welcome) and a little from the right (behind the card), leaving the middle clear. */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-navy/75 via-brand-navy/35 to-brand-navy/20 lg:hidden" />
        <div className="absolute inset-0 hidden lg:block bg-gradient-to-t from-brand-navy/80 via-brand-navy/10 to-transparent" />
        <div className="absolute inset-0 hidden lg:block bg-gradient-to-l from-brand-navy/40 via-transparent to-transparent" />
      </div>

      {/* The card: on the right on a wide screen, after the welcome on a phone. */}
      <div className="relative order-2 w-full px-3 pb-6 sm:px-6 lg:w-[480px] lg:shrink-0 lg:py-10 lg:pr-14 lg:pl-0">
        {children}
      </div>

      <div className="relative order-1 flex flex-col gap-3 px-6 pb-6 pt-10 text-white sm:px-10 lg:flex-1 lg:self-stretch lg:justify-end lg:px-14 lg:pb-14">
        <p className="max-w-md font-heading text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl [text-shadow:0_2px_12px_rgba(0,0,0,0.35)]">
          {title}
        </p>
        <p className="max-w-sm text-sm text-white/90 sm:text-base [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]">{subtitle}</p>
        {photos.length > 1 && (
          <div className="mt-0.5 flex items-center gap-2">
            {photos.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1} of ${photos.length}`}
                aria-current={i === index ? 'true' : undefined}
                // The bar is drawn inside a 24px-tall button, so the dot is easy to tap on a phone.
                className="group flex h-6 items-center rounded-full focus-ring"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? 'w-12 bg-white' : 'w-6 bg-white/45 group-hover:bg-white/70'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
