/**
 * Product rule: phone numbers must never be shared through the portal. Any free
 * text one person can show another (booking instructions, messages, notes) goes
 * through `stripPhoneNumbers`, which removes anything that looks like a phone
 * number and reports whether it did.
 *
 * What counts as a phone number:
 *  - a Kenyan number starting `07…` or `01…` (so `011…` too), once it has 4+ digits;
 *  - anything with a country code — a leading `+` or `00` (4+ digits), or `254…` (5+ digits);
 *  - any other run of 8+ digits;
 * with spaces, dots, dashes or brackets allowed between the digits, and numbers spelled out in words
 * ("zero seven one two …", 7+ digit-words in a row).
 * Plain dates (`2026-10-01`, `01-10-2026`) and prices with commas (`15,000`) are left alone.
 * This runs in the browser, so it is a guard rail rather than enforcement — the backend
 * doesn't check — which is why what is displayed is stripped again too.
 */

export const PHONE_REMOVED_TEXT = '[phone number removed]';

// A run of digits with optional spaces . - ( ) between them, optionally led by + or 00.
const DIGIT_RUN = /(?<![\w])(?:\+\s*|00\s*)?\(?\d(?:[\s().-]*\d)+/g;

// "zero seven one two three four five six" — digit words (7+ in a row).
const WORD = '(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)';
const SPELLED_OUT = new RegExp(`\\b${WORD}(?:[\\s,.-]+${WORD}\\b){6,}`, 'gi');

// Digits typed straight after a removed number belong to it (someone typing a number digit by digit
// would otherwise leave the tail of it visible), so they are swallowed into the placeholder.
const CONTINUATION = /\[phone number removed\][\s().-]*\d[\d\s().-]*/g;

const DATE_LIKE = /^(?:(?:19|20)\d{2}-\d{1,2}-\d{1,2}|\d{1,2}[.-]\d{1,2}[.-](?:19|20)?\d{2})$/;

function looksLikePhone(run) {
  const trimmed = run.trim();
  if (DATE_LIKE.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, '');
  if (/^(?:\+|00)/.test(trimmed)) return digits.length >= 4;
  if (digits.startsWith('254')) return digits.length >= 5;
  if (/^0[17]/.test(digits)) return digits.length >= 4;
  return digits.length >= 8;
}

/**
 * @param {string} text
 * @returns {{ text: string, removed: boolean }}
 */
export function stripPhoneNumbers(text) {
  const input = typeof text === 'string' ? text : '';
  let removed = false;

  let out = input.replace(DIGIT_RUN, (run) => {
    if (!looksLikePhone(run)) return run;
    removed = true;
    // Keep the whitespace that trailed the run, so words around it don't fuse together.
    const trailing = run.match(/\s*$/)[0];
    return PHONE_REMOVED_TEXT + trailing;
  });

  out = out.replace(SPELLED_OUT, () => {
    removed = true;
    return PHONE_REMOVED_TEXT;
  });

  out = out.replace(CONTINUATION, (run) => {
    removed = true;
    return PHONE_REMOVED_TEXT + (run.match(/\s*$/)[0] || '');
  });

  return { text: out, removed };
}

/** Whether `text` contains something that looks like a phone number. */
export function containsPhoneNumber(text) {
  return stripPhoneNumbers(text).removed;
}
