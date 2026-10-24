import { FONTS, fontStack } from './src/theme/fonts.js';

/** @type {import('tailwindcss').Config} */
/** A colour that follows the light / dark theme: its value is the CSS variable `--c-<name>` (index.css). */
const themed = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Dark mode is a `dark` class on <html> (set before the page draws — index.html — and by the ThemeToggle).
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // The Figma "Qent" car-rental design system (docs/design.md §4), named for what each colour does so a page
        // never picks a raw hex. Each one has a light and a dark value — the variables in index.css (`:root` and
        // `.dark`) — so every page switches theme without its own dark styles.
        canvas:         themed('canvas'),       // the page background (light: "coloe bg" #F8F8F8)
        surface:        themed('surface'),      // cards, panels (light: white)
        subtle:         themed('subtle'),       // quiet fills: chips, tiles, image wells, table stripes (light: #EDEDED)
        line:           themed('line'),         // field and card outlines (light: "Stoke" #D7D7D7)
        well:           themed('well'),         // the panel behind a car photo — light grey in both themes
        ink:            themed('ink'),          // main text (light: black)
        // Secondary text. The design's "Text 2" is #7F7F7F, but that is only 3.9:1 on white — below the 4.5:1 that
        // small text needs to be readable — so it is #6B6B6B (5.3:1) in the light theme.
        muted:          themed('muted'),
        icon:           themed('icon'),         // outline icons
        // Buttons, the selected state, links — Ramellian navy in the light theme (product owner, 2026-10-24), and
        // Ramellian gold with navy text in the dark one (navy buttons would vanish on a dark page).
        accent:         themed('accent'),
        'accent-hover': themed('accent-hover'),
        'on-accent':    themed('on-accent'),    // text and icons on an accent fill
        overlay:        themed('overlay'),      // dark panels and bands
        star:           '#C9A84C',              // rating stars and unread counts — Ramellian gold
        // Ramellian's own colours, mixed in sparingly: section labels, the hero's highlighted word, the phone tab
        // bar, the left menu, the closing banner and the contract/invoice letterhead. `brand-gold` is for lines,
        // dots and fills; text in gold uses `brand-gold-deep` (readable on the page in either theme).
        'brand-navy':      '#16213E',
        'brand-gold':      '#C9A84C',
        'brand-gold-deep': themed('gold-deep'),
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
