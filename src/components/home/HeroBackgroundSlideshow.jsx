import React, { useEffect, useState } from 'react';
import nairobiSkyline from '../../assets/destinations/nairobi-skyline.jpg';
import dianiBeach from '../../assets/destinations/diani-beach.jpg';
import dianiReefResort from '../../assets/destinations/diani-reef-resort.jpg';
import { useMediaQuery } from '../../hooks/useMediaQuery';

// Wide, high-resolution photos only: a hero is full-width, so anything much under ~1500px across looks soft.
// (coastal-lodge.jpg, 602×602, was dropped from the rotation for that reason; executive-residence was removed at the
// product owner's request, 2026-10-25.) `position` keeps the subject in
// frame when the photo is cropped to the hero's shape.
const IMAGES = [
  { src: nairobiSkyline, position: 'center 60%' },
  { src: dianiBeach, position: 'center' },
  { src: dianiReefResort, position: 'center' },
];

const SLIDE_DURATION_MS = 7000;

/**
 * Crossfading destination-photo background for the hero — the places Ramellian actually takes clients
 * (Nairobi, the coast) rather than stock imagery. The photo is shown at full colour under a Ramellian-navy
 * gradient (deepest at the top, where the white headline sits, lighter lower down so the photo shows), and
 * it fades into the page at the bottom edge. The current photo drifts in very slowly (a gentle zoom); with
 * "reduce motion" switched on in the device's settings, the slideshow stays on the first photo and nothing moves.
 *
 * Deliberately a sibling absolute layer with its own `overflow-hidden`, not a wrapper around the hero's
 * content — an ancestor with `overflow-hidden` would clip the booking bar's date-picker popover, which is
 * also `position: absolute` (see HeroSection.jsx's own note on this same gotcha).
 */
export default function HeroBackgroundSlideshow() {
  const [index, setIndex] = useState(0);
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)', false);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % IMAGES.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-brand-navy">
      {IMAGES.map((image, i) => (
        <img
          key={image.src}
          src={image.src}
          alt=""
          loading={i === 0 ? 'eager' : 'lazy'}
          fetchpriority={i === 0 ? 'high' : undefined}
          decoding="async"
          style={{ objectPosition: image.position }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1800ms] ease-in-out ${
            i === index ? 'opacity-100 motion-safe:animate-hero-drift' : 'opacity-0'
          }`}
        />
      ))}
      {/* Navy scrim: deepest behind the headline, lighter lower down so the photo itself shows. */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-navy/75 via-brand-navy/45 to-brand-navy/25" />
      {/* Fades the photo into the page below, so the hero has no hard bottom edge. */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-canvas to-transparent" />
    </div>
  );
}
