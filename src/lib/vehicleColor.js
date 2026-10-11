/**
 * `VehicleResponse.color` is free text an owner typed in (e.g. "Pearl White", "Jet Black", "Metallic
 * Silver"), not an enum — so there's no fixed list to switch on. This maps it to a CSS color by matching
 * the most common color words inside whatever was actually typed, tuned to still read clearly against this
 * app's dark background (a literal black or white, for instance, would either vanish into the background or
 * blow out against it). An unrecognized or missing color falls back to a neutral grey rather than guessing.
 */
const COLOR_KEYWORDS = [
  { match: /white|pearl|ivory|cream/i, css: '#F4F4F5' },
  { match: /black|jet|onyx|ebony/i, css: '#9CA3AF' },
  { match: /silver|titanium/i, css: '#C7CCD6' },
  { match: /gr[ae]y/i, css: '#9AA3B2' },
  { match: /gold|champagne|bronze/i, css: '#C9A84C' },
  { match: /beige|tan|sand/i, css: '#D8C3A5' },
  { match: /brown/i, css: '#B08968' },
  { match: /red|maroon|crimson|burgundy/i, css: '#F87171' },
  { match: /orange/i, css: '#FB923C' },
  { match: /yellow/i, css: '#FACC15' },
  { match: /green/i, css: '#4ADE80' },
  { match: /blue|navy/i, css: '#60A5FA' },
  { match: /purple|violet/i, css: '#C084FC' },
  { match: /pink/i, css: '#F472B6' },
];

const FALLBACK_CSS = '#8A93A6';

/** A CSS color for `color` (a vehicle's free-text color), or the neutral fallback if it's empty or unrecognized. */
export function vehicleColorToCss(color) {
  if (!color) return FALLBACK_CSS;
  const found = COLOR_KEYWORDS.find((c) => c.match.test(color));
  return found ? found.css : FALLBACK_CSS;
}
