import { z } from 'zod';

/** What we tell someone whose phone number doesn't look right. */
export const PHONE_HINT = 'Enter a valid phone number, e.g. 0712 345 678 or +254 712 345 678.';

/**
 * A phone number in one standard form — `+2547XXXXXXXX` — or null when it isn't a real-looking number.
 *
 *  - Kenyan numbers (the default) in any common way of writing them: `0712 345 678`, `0112 345 678`,
 *    `712345678`, `254712345678`, `+254 712-345-678`. Kenyan mobiles are 9 digits after the country code,
 *    starting 7 or 1.
 *  - Other countries: written with `+` and the country code, 8–15 digits in all (the international standard).
 *
 * Spaces, dashes, dots and brackets are ignored.
 * @param {string} input
 * @returns {string|null}
 */
export function normalizePhone(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  if (/[^\d\s+().-]/.test(raw)) return null; // letters or other symbols
  const plus = raw.startsWith('+') || raw.startsWith('00');
  const digits = raw.replace(/\D/g, '').replace(/^00/, '');

  // Kenya
  const kenyan = digits.match(/^(?:254|0)?([71]\d{8})$/);
  if (kenyan && (!plus || digits.startsWith('254'))) return `+254${kenyan[1]}`;

  // Elsewhere: an international number needs its +country code.
  if (plus && !digits.startsWith('254') && /^[1-9]\d{7,14}$/.test(digits)) return `+${digits}`;
  return null;
}

/** Whether `input` is a valid phone number (see `normalizePhone`). */
export function isValidPhone(input) {
  return normalizePhone(input) !== null;
}

/**
 * The form field for a required phone number: checked with `normalizePhone`, and handed to the form's submit
 * already in the standard `+254…` form.
 */
export const phoneField = z
  .string()
  .trim()
  .min(1, 'Enter your phone number')
  .max(30, 'Phone number must be 30 characters or fewer')
  .refine(isValidPhone, PHONE_HINT)
  .transform((v) => normalizePhone(v));
