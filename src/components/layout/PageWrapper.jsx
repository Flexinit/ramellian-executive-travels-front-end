import React from 'react';

/**
 * Standard page content wrapper — centers content, applies the site's
 * responsive horizontal/vertical rhythm. Used inside route `<Outlet>`s.
 *
 * @param {React.ReactNode} children
 * @param {string} className
 */
export default function PageWrapper({ children, className = '' }) {
  // The site width (grows on big screens — .site-width in index.css), unless the page sets its own max-w.
  const width = /(^|\s)max-w-/.test(className) ? '' : 'site-width';
  return (
    <main className={`px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-14 ${width} mx-auto w-full ${className}`}>
      {children}
    </main>
  );
}
