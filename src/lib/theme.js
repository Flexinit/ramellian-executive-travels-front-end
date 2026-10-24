/**
 * Light / dark theme — for signed-in people only (product owner, 2026-10-25). Everyone starts in the light theme and
 * it never switches by itself (the device's own dark setting is ignored); a signed-in person can pick dark with the
 * ThemeToggle in the top bar, and that pick is remembered in this browser. Visitors — and the log-in and sign-up
 * pages — are always light. The theme is a `dark` class on <html>; the colours are the `--c-*` variables in
 * index.css. index.html applies a saved dark theme before the page first draws (when a session is already there),
 * using the same key and rule as here.
 */
export const THEME_KEY = 'ramellian.theme';

/** The saved choice: 'dark', or 'light' (the default). */
export function savedTheme() {
  try {
    return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** Puts the page in the theme it should be in: the saved one for a signed-in person, light for anyone else. */
export function applyTheme(isAuthenticated) {
  document.documentElement.classList.toggle('dark', !!isAuthenticated && savedTheme() === 'dark');
}

/** A signed-in person picking a theme: switches to it and remembers it. */
export function setTheme(theme) {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage blocked: it still switches, just isn't remembered.
  }
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
