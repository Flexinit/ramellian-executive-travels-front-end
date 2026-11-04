/**
 * Pesapal's payment page is shown inside the portal, in an iframe (product owner, 2026-10-27), instead of sending the
 * whole browser away to it. When the payment is done, Pesapal sends the iframe — not the page — to its callback
 * address, `/payment/success` on this site. That copy of the site, finding itself inside a frame, only tells the page
 * around it that the payment is finished (`notifyPaymentDone`, called from main.jsx before the app would load), and the
 * page carries on: it checks the payment's status as usual.
 */

/** The message the iframe sends its parent page. */
export const PESAPAL_DONE = 'ramellian:pesapal-done';

/** This window is inside a frame (Pesapal's callback landing in the payment iframe). */
export function isInsideFrame() {
  try {
    return window.self !== window.top;
  } catch {
    return true; // a cross-origin parent can't even be compared
  }
}

/** Tells the page around the iframe that Pesapal has finished — only a page on this same site will hear it. */
export function notifyPaymentDone(search = window.location.search) {
  window.parent.postMessage({ type: PESAPAL_DONE, search }, window.location.origin);
}

/**
 * Whether a `message` event is this site's own "payment finished" — from the same origin, with the right type.
 * @param {MessageEvent} event
 */
export function isPaymentDoneMessage(event) {
  return event.origin === window.location.origin && event.data?.type === PESAPAL_DONE;
}
