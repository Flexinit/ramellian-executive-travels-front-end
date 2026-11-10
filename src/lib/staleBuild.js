/**
 * After a deploy, a tab opened before it still points at the old build's page files (`/assets/*-HASH.js`), which the
 * new build has replaced: opening a page it hasn't loaded yet fails ("Failed to fetch dynamically imported module"),
 * and React.lazy remembers the failure, so **Try Again** fails the same way. A fresh load of the page picks up the new
 * build — done here once, automatically, rather than leaving the person on "Something went wrong".
 */

const KEY = 'stale-build-reload-at';
/** No second reload within this long of the last one, so a page file that's really missing can't reload forever. */
const GUARD_MS = 30 * 1000;

/** Whether `error` is a page file (code chunk) that couldn't be loaded. */
export function isChunkLoadError(error) {
  const text = `${error?.name || ''} ${error?.message || ''}`;
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError|Loading (CSS )?chunk \S+ failed/i.test(text);
}

/**
 * Reloads the page to pick up the new build, unless it already did so in the last `GUARD_MS`.
 * @returns {boolean} whether it's reloading
 */
export function reloadForNewBuild() {
  try {
    const last = Number(sessionStorage.getItem(KEY)) || 0;
    if (Date.now() - last < GUARD_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Without storage there's no loop guard: reload anyway — one stale tab is the common case.
  }
  window.location.reload();
  return true;
}

/** Vite's own signal that a page file failed to preload (`vite:preloadError`): reload instead of failing. */
export function listenForStaleBuild() {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewBuild()) event.preventDefault();
  });
}
