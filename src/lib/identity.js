import { DOCUMENT_STATUSES, DOCUMENT_TYPES } from './constants';

/**
 * The identity document an account gives — a National ID *or* a Passport, never both — and the photos each
 * needs. Every kind includes a selfie of the person holding the document, so whoever reviews it can see the
 * document belongs to the person uploading it. The backend only accepts its fixed set of document types
 * (a made-up type is refused with 400 "Invalid document type"), so the selfies are combined into the same
 * image as the document and sent under NATIONAL_ID / PASSPORT (docs/backend-requests.md item on a separate
 * selfie type).
 *
 * `ocr: true` marks the photo the ID / passport number is read from; `selfie: true` opens the front camera
 * on a phone.
 */
export const IDENTITY_KINDS = Object.freeze({
  [DOCUMENT_TYPES.NATIONAL_ID]: {
    type: DOCUMENT_TYPES.NATIONAL_ID,
    label: 'National ID',
    numberLabel: 'ID number',
    shots: [
      { key: 'front', label: 'Front of your ID', panel: 'ID — FRONT', ocr: true },
      { key: 'back', label: 'Back of your ID', panel: 'ID — BACK' },
      { key: 'selfieFront', label: 'Selfie holding the front', panel: 'SELFIE WITH FRONT', selfie: true },
      { key: 'selfieBack', label: 'Selfie holding the back', panel: 'SELFIE WITH BACK', selfie: true },
    ],
  },
  [DOCUMENT_TYPES.PASSPORT]: {
    type: DOCUMENT_TYPES.PASSPORT,
    label: 'Passport',
    numberLabel: 'Passport number',
    shots: [
      { key: 'photoPage', label: 'Passport photo page', panel: 'PASSPORT PHOTO PAGE', ocr: true },
      { key: 'selfie', label: 'Selfie holding the photo page', panel: 'SELFIE WITH PASSPORT', selfie: true },
    ],
  },
});

/**
 * The account's identity document as it stands — the National ID or Passport that counts (pending or
 * approved), else the rejected one, else undefined.
 * @param {Array<{type: string, status: string}>} [documents]
 */
export function currentIdentityDocument(documents = []) {
  const ids = documents.filter((d) => d.type === DOCUMENT_TYPES.NATIONAL_ID || d.type === DOCUMENT_TYPES.PASSPORT);
  return (
    ids.find((d) => d.status === DOCUMENT_STATUSES.APPROVED) ||
    ids.find((d) => d.status !== DOCUMENT_STATUSES.REJECTED) ||
    ids[0]
  );
}

// OCR often swaps these for digits.
const toDigits = (s) => s.replace(/[OQD]/g, '0').replace(/[IL|]/g, '1').replace(/S/g, '5').replace(/B/g, '8');

/** A Kenyan ID number: 7–9 digits (older cards 7–8, Maisha cards 9). */
function nationalIdNumber(text) {
  const lines = text.toUpperCase().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const runs = (line) => (toDigits(line).match(/\d{7,9}/g) || []);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const label = line.match(/\bID\s*(?:NUMBER|NO\b\.?|NUM\b)/);
    if (!label) continue;
    // "ID NUMBER: 12345678" on the same line.
    const after = runs(line.slice(label.index + label[0].length));
    if (after.length > 0) return after[0];
    // Older cards put "SERIAL NUMBER   ID NUMBER" over a line of values in the same order.
    const below = lines[i + 1] ? runs(lines[i + 1]) : [];
    if (below.length > 0) {
      const serialFirst = /SERIAL/.test(line) && line.indexOf('SERIAL') < label.index;
      return serialFirst && below.length > 1 ? below[1] : below[0];
    }
  }
  // No label read — accept a lone 7–8 digit number (a 9-digit one could be the serial number).
  const all = [...new Set(lines.flatMap((l) => l.match(/(?<!\d)\d{7,8}(?!\d)/g) || []))];
  return all.length === 1 ? all[0] : null;
}

const MRZ_WEIGHTS = [7, 3, 1];
const mrzValue = (c) => (c === '<' ? 0 : /\d/.test(c) ? Number(c) : c.charCodeAt(0) - 55);
const mrzCheck = (s) => [...s].reduce((sum, c, i) => sum + mrzValue(c) * MRZ_WEIGHTS[i % 3], 0) % 10;

/**
 * A passport number — from the machine-readable zone when its check digit holds (the most reliable read),
 * else a "Passport No" label, else a lone letters-then-digits number.
 */
function passportNumber(text) {
  const upper = text.toUpperCase();
  for (const raw of upper.split(/\r?\n/)) {
    const line = raw.replace(/\s/g, '').replace(/«/g, '<');
    const m = line.match(/^([A-Z0-9<]{9})([0-9])[A-Z<]{3}\d{6}/);
    if (m && mrzCheck(m[1]) === Number(m[2])) {
      const number = m[1].replace(/<+$/, '');
      if (number) return number;
    }
  }
  const labelled = upper.match(/PASSPORT\s*(?:NO|NUMBER)\.?\s*[:.]?\s*\n?\s*([A-Z]{1,2}\d{6,8})\b/);
  if (labelled) return labelled[1];
  const all = [...new Set(upper.match(/\b[A-Z]{1,2}\d{6,8}\b/g) || [])];
  return all.length === 1 ? all[0] : null;
}

/**
 * The ID / passport number in text read off a document photo, or null if it can't be found with confidence.
 * @param {string} text
 * @param {string} kind — DOCUMENT_TYPES.NATIONAL_ID or DOCUMENT_TYPES.PASSPORT
 */
export function extractIdNumber(text = '', kind) {
  return kind === DOCUMENT_TYPES.PASSPORT ? passportNumber(text) : nationalIdNumber(text);
}

/**
 * Reads the ID / passport number off a photo, in the browser (Tesseract, loaded only when needed — its
 * engine and English data come from a CDN on first use).
 * @param {File} file
 * @param {string} kind
 * @returns {Promise<string|null>}
 */
export async function readIdNumber(file, kind) {
  const { default: Tesseract } = await import('tesseract.js');
  const { data } = await Tesseract.recognize(file, 'eng');
  return extractIdNumber(data?.text || '', kind);
}
