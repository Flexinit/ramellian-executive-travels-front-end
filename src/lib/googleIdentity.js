/**
 * Loads Google's sign-in library (Google Identity Services) the first time it is needed, and hands back its `accounts.id` object.
 * The library is Google's own script — it draws the official button and returns a signed ID token (`credential`), which the backend
 * checks with Google. Rejects if the script can't load (offline, or blocked by an ad blocker), so the caller can just hide the button.
 */
const SRC = 'https://accounts.google.com/gsi/client';

let loading = null;

export function loadGoogleIdentity() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('Google sign-in did not start')));
    script.onerror = () => reject(new Error('Google sign-in could not be loaded'));
    document.head.appendChild(script);
  }).catch((error) => {
    loading = null; // allow another try later
    throw error;
  });
  return loading;
}
