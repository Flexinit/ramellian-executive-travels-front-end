import { useSyncExternalStore } from 'react';

/**
 * A record of the document decisions made from this portal, kept in this browser.
 *
 * The backend only lists documents still waiting for review (`GET /documents/admin/pending`); once one is
 * approved or rejected it can no longer be listed, and the review call has no way to look one up. So that an
 * administrator can find a decided document again (to look at it, or to reverse the decision), the portal
 * remembers each decision it sends. Decisions made elsewhere — another browser, another tool, or before this
 * record existed — aren't in it.
 */

const KEY = 'ramellian.documentReviews';
const MAX_KEPT = 500;
const listeners = new Set();

let lastRaw = null;
let lastList = [];

function parse(raw) {
  try {
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/** @returns {object[]} the recorded decisions, newest first (the same array until something changes) */
export function getReviews() {
  let raw = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // storage unavailable — nothing is remembered
  }
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastList = parse(raw);
  }
  return lastList;
}

function save(list) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_KEPT)));
  } catch {
    // storage full or unavailable — the decision was still sent to the backend
  }
  listeners.forEach((listener) => listener());
}

/**
 * Remembers a decision. `document` is the backend's `DocumentResponse` for the file that was reviewed.
 * @param {object} document
 * @param {'APPROVED'|'REJECTED'} status
 * @param {string} [notes]
 */
export function recordReview(document, status, notes = '') {
  const { id, documentType, vehicleId, originalFileName, contentType, fileSize, createdAt } = document;
  const entry = { id, documentType, vehicleId, originalFileName, contentType, fileSize, createdAt, status, notes, decidedAt: new Date().toISOString() };
  save([entry, ...getReviews().filter((r) => r.id !== id)]);
}

/** Forgets a decision (used when a document is sent back to pending review). */
export function forgetReview(id) {
  save(getReviews().filter((r) => r.id !== id));
}

function subscribe(listener) {
  listeners.add(listener);
  const onStorage = (event) => {
    if (event.key === KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** @param {'APPROVED'|'REJECTED'} status @returns {object[]} the recorded decisions with that outcome, newest first */
export function useReviewHistory(status) {
  const all = useSyncExternalStore(subscribe, getReviews, getReviews);
  return all.filter((r) => r.status === status);
}
