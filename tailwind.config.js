import { FONTS, fontStack } from './src/theme/fonts.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // The Figma "Qent" car-rental design system (docs/design.md §4) — a light page, white cards, black text and
        // charcoal pill buttons. Named for what they do, so a page never picks a raw hex.
        canvas:         '#F8F8F8', // the page background ("coloe bg")
        surface:        '#FFFFFF', // cards, panels, the menu ("White")
        subtle:         '#EDEDED', // quiet fills: chips, feature tiles, the image well behind a car ("Secondary")
        line:           '#D7D7D7', // field and card outlines ("Stoke")
        ink:            '#000000', // main text ("Text 1")
        // Secondary text. The design's "Text 2" is #7F7F7F, but that is only 3.9:1 on white — below the 4.5:1 that
        // small text needs to be readable — so it is a step darker here (5.3:1).
        muted:          '#6B6B6B',
        icon:           '#767676', // outline icons ("icon")
        // Buttons, the selected state, links — Ramellian navy in the design's "Bttons" slot (product owner,
        // 2026-10-24: "can the black buttons be Ramellian blue instead?").
        accent:         '#16213E',
        'accent-hover': '#25365F', // a button under the pointer — the same navy, a step lighter
        'on-accent':    '#FFFFFF', // text and icons on an accent fill
        overlay:        '#131927', // dark panels and bands
        star:           '#C9A84C', // rating stars and unread counts — Ramellian gold in the design's star slot

        // Ramellian's own colours, mixed in sparingly over the design system: section labels, the hero's
        // highlighted word, the phone tab bar, the closing banner and the contract/invoice letterhead.
        // `brand-gold` is for lines, dots and fills; text in gold uses `brand-gold-deep` (readable on white).
        'brand-navy':      '#16213E',
        'brand-gold':      '#C9A84C',
        'brand-gold-deep': '#8C6D1F',
      },
      fontFamily: {
        // Set in src/theme/fonts.js — change the fonts there, not here.
        heading: fontStack(FONTS.heading),
        body:    fontStack(FONTS.body),
      },
      boxShadow: {
        card: '0 4px 10px 0 rgba(0,0,0,0.06)',
        lift: '0 4px 9.8px 0 rgba(0,0,0,0.25)', // the design's one drop shadow — floating bars, the phone tab bar
      },
      borderRadius: {
        card: '14px', // cards and panels
        tile: '10px', // feature tiles, image wells, fields
      },
      keyframes: {
        /**
         * Animates the Tailwind transform variables rather than `transform`
         * directly, so this composes correctly with whatever translate/scale
         * utilities (e.g. `-translate-x-1/2` for centering) are already on
         * the element instead of overwriting them.
         */
        'tile-in': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // A soft Ramellian-gold ring and glow that rises and fades on a tile — the one-time highlight sweep.
        'tile-glow': {
          '0%':   { boxShadow: '0 0 0 0 rgba(201,168,76,0)', borderColor: 'transparent' },
          '35%':  { boxShadow: '0 0 0 4px rgba(201,168,76,0.28), 0 6px 18px 0 rgba(201,168,76,0.25)', borderColor: 'rgba(201,168,76,0.75)' },
          '100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0)', borderColor: 'transparent' },
        },
        'hero-drift': {
          '0%':   { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)' },
        },
        'panel-in': {
          '0%':   { opacity: '0', '--tw-translate-y': '-6px' },
          '100%': { opacity: '1', '--tw-translate-y': '0px' },
        },
      },
      animation: {
        // The hero photo's slow drift-in (HeroBackgroundSlideshow) — only under `motion-safe:`.
        'hero-drift': 'hero-drift 9s ease-out forwards',
        // Feature tiles fading up one after another, once (FeatureGrid staggers the delay) — only under `motion-safe:`.
        // ...then a gold highlight passes over each in turn, once. FeatureTile sets both delays per tile.
        // `backwards`, not `both`: once done they let go, so the hover lift and gold border still work.
        'tile-in': 'tile-in 420ms cubic-bezier(0.16, 1, 0.3, 1) backwards, tile-glow 1100ms ease-out backwards',
        // A gentle, unhurried entrance — deliberately not a snap or bounce.
        'panel-in': 'panel-in 240ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
