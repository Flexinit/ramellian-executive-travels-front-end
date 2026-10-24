/**
 * The app's fonts — the one place to change them. Everything else reads from here:
 *  - tailwind.config.js → the `font-heading` / `font-body` classes used across the app;
 *  - vite.config.js → the Google Fonts <link> put into index.html (`<!-- app-fonts -->`);
 *  - PageLoader → the loading animation's lettering.
 *
 * To switch, change `heading` / `body` to any Google Fonts family name (exactly as Google spells it), adjust
 * `weights` if that family lacks one, and restart `npm run dev`. Heading and body may be the same family.
 */
export const FONTS = {
  heading: 'Roboto',
  body: 'Roboto',
  // Loaded for both families: 400 text, 500–600 labels and buttons (the design's button font is Semi Bold), 700 headings.
  weights: [400, 500, 600, 700],
};

const FALLBACK = ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'];

/** A CSS font stack for one family, e.g. `["Roboto", "system-ui", …]`. */
export function fontStack(family) {
  return [`"${family}"`, ...FALLBACK];
}

/** The Google Fonts stylesheet URL for `FONTS` (each distinct family once, with `weights`). */
export function googleFontsUrl(fonts = FONTS) {
  const families = [...new Set([fonts.heading, fonts.body])];
  const weights = [...fonts.weights].sort((a, b) => a - b).join(';');
  const params = families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@${weights}`);
  return `https://fonts.googleapis.com/css2?${params.join('&')}&display=swap`;
}
