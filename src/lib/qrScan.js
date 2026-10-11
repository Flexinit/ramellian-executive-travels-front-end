import jsQR from 'jsqr';
import { api } from './api';
import { photoSrc } from './vehiclePhotos';

/**
 * Reading the QR code on an insurance sticker, in the browser, from the photo an owner uploaded.
 *
 * Kenya's digital motor insurance certificates carry a QR code that the Association of Kenya Insurers' verifier
 * (dmvic.com, the AKI Vehicle Insurance Certificate app, or a USSD code) turns into Genuine / Invalid / Cancelled /
 * Expired. Reading the code here only tells an administrator that the sticker HAS a readable QR and what it says;
 * whether the certificate is valid is the verifier's answer, not ours.
 */

/** The sizes (longest side, in pixels) tried in turn — a large phone photo often decodes better scaled down. */
const SIZES = [1600, 900, 500];

/** Draws the image at most `max` pixels on its longest side and returns its pixels. */
function pixelsOf(bitmap, max) {
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

/**
 * Looks for a QR code in an image.
 * @param {Blob} blob
 * @returns {Promise<string|null>} what the QR code says, or null if none could be read
 */
export async function readQrFromBlob(blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    for (const size of SIZES) {
      const { data, width, height } = pixelsOf(bitmap, size);
      const code = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
      if (code?.data) return code.data;
    }
    return null;
  } finally {
    bitmap.close?.();
  }
}

/**
 * Fetches a sticker photo (with the login token if it's a server file — those refuse a plain link) and reads its QR code.
 * @param {string} src the vehicle's `insuranceVerificationStickerPhoto`
 * @returns {Promise<string|null>}
 */
export async function scanSticker(src) {
  const url = photoSrc(src);
  const blob = /^(blob:|data:)/i.test(url) ? await (await fetch(url)).blob() : (await api.get(url, { responseType: 'blob' })).data;
  return readQrFromBlob(blob);
}

/**
 * What a QR payload is: a web address (only http/https — never `javascript:` or the like) or plain text.
 * @param {string} payload
 * @returns {{ kind: 'url', url: string, text: string } | { kind: 'text', text: string }}
 */
export function describeQrPayload(payload) {
  const text = String(payload ?? '').trim();
  try {
    const url = new URL(text);
    if (url.protocol === 'https:' || url.protocol === 'http:') return { kind: 'url', url: url.href, text };
  } catch {
    // not a web address
  }
  return { kind: 'text', text };
}

const squash = (value) => String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Whether the vehicle's registration number appears in the QR's text (ignoring spaces and punctuation, so
 * `KDA 123A` matches `KDA123A`). A QR that holds only a certificate code won't contain it — that is "not found",
 * not "wrong".
 */
export function qrMentionsRegistration(payload, registration) {
  const wanted = squash(registration);
  return wanted.length >= 4 && squash(payload).includes(wanted);
}
