import { FONTS, fontStack } from './src/theme/fonts.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'brand-dark':       '#1A1A2E',
        'brand-navy':       '#16213E',
        'brand-gold':       '#C9A84C',
        'brand-gold-light': '#E8C97A',
        'brand-white':      '#F5F5F5',
        'brand-grey':       '#8A8A9A',
      },
      fontFamily: {
        // Set in src/theme/fonts.js — change the fonts there, not here.
        heading: fontStack(FONTS.heading),
        body:    fontStack(FONTS.body),
      },
      boxShadow: {
        card: '0 4px 24px 0 rgba(0,0,0,0.18)',
        glow: '0 0 16px 0 rgba(201,168,76,0.35)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)',
      },
      keyframes: {
        /**
         * Animates the Tailwind transform variables rather than `transform`
         * directly, so this composes correctly with whatever translate/scale
         * utilities (e.g. `-translate-x-1/2` for centering) are already on
         * the element instead of overwriting them.
         */
        'panel-in': {
          '0%':   { opacity: '0', '--tw-translate-y': '-6px' },
          '100%': { opacity: '1', '--tw-translate-y': '0px' },
        },
      },
      animation: {
        // A gentle, unhurried entrance — deliberately not a snap or bounce.
        'panel-in': 'panel-in 240ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
