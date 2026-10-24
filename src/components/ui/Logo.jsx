import React from 'react';

/**
 * Ramellian brand logo — image + wordmark.
 * Always use this component; never raw <img> tags for the logo.
 *
 * @param {'sm'|'md'|'lg'} size
 * @param {boolean} wordmarkOnly — hide image, show text only
 * @param {boolean} compactOnTinyScreens — on the narrowest phones (under 360px) show only the mark, not the
 *   wordmark, so a full header row still fits (the top bar)
 * @param {boolean} [invertFromMd] — from `md` up, white wordmark and gold subtitle, for the navy column the logo sits in
 *   above the signed-in left menu (on a phone it's still on the white top bar, so it stays dark there)
 * @param {string} className
 */
export default function Logo({ size = 'md', wordmarkOnly = false, compactOnTinyScreens = false, invertFromMd = false, className = '' }) {
  const containerSizes = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-16',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  const imgSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`flex items-center gap-2 ${containerSizes[size]} ${className}`}>
      {!wordmarkOnly && (
        <img
          src="/brand-logo-1024-transparent.png"
          alt="Ramellian Executive Travels"
          className={`${imgSizes[size]} object-contain`}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      <div className={`flex flex-col leading-tight ${compactOnTinyScreens && !wordmarkOnly ? 'max-[359px]:hidden' : ''}`}>
        <span className={`font-heading font-bold text-accent ${invertFromMd ? 'md:text-white' : ''} ${textSizes[size]}`}>
          RAMELLIAN
        </span>
        {size !== 'sm' && (
          <span className={`text-[10px] font-body font-medium text-muted tracking-widest uppercase ${invertFromMd ? 'md:text-brand-gold' : ''}`}>
            Executive Travels
          </span>
        )}
      </div>
    </div>
  );
}
