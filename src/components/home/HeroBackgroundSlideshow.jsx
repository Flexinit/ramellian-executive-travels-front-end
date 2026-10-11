import React, { useEffect, useState } from 'react';
import nairobiSkyline from '../../assets/destinations/nairobi-skyline.jpg';
import dianiBeach from '../../assets/destinations/diani-beach.jpg';
import dianiReefResort from '../../assets/destinations/diani-reef-resort.jpg';
import coastalLodge from '../../assets/destinations/coastal-lodge.jpg';
import executiveResidence from '../../assets/destinations/executive-residence.webp';

const IMAGES = [
  { src: nairobiSkyline, alt: '' },
  { src: dianiBeach, alt: '' },
  { src: executiveResidence, alt: '' },
  { src: dianiReefResort, alt: '' },
  { src: coastalLodge, alt: '' },
];

const SLIDE_DURATION_MS = 6000;

/**
 * Crossfading destination-photo background for the hero — the places
 * Ramellian actually takes clients (Nairobi, the coast) rather than stock
 * imagery. Sits behind the headline/booking bar with a dark scrim so text
 * stays legible over any photo.
 *
 * Deliberately a sibling absolute layer with its own `overflow-hidden`,
 * not a wrapper around the hero's content — an ancestor with
 * `overflow-hidden` would clip the booking bar's date-picker popover,
 * which is also `position: absolute` (see HeroSection.jsx's own note on
 * this same gotcha for the ambient glow layer it replaces).
 */
export default function HeroBackgroundSlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % IMAGES.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {IMAGES.map((image, i) => (
        <img
          key={image.src}
          src={image.src}
          alt={image.alt}
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1800ms] ease-in-out ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      {/* Dark scrim — keeps headline/booking bar legible over any photo, on-theme */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/80 via-brand-dark/85 to-brand-dark" />
    </div>
  );
}
