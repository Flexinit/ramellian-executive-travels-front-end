/**
 * The site's own pages, linked from the top bar (from `lg` up), the visitor's phone menu and the signed-in phone
 * menu (the left drawer) — one list, so they never drift apart. "Vehicles" and "Services" are deliberately not
 * here: browsing is the "Rent a Car" button, and the Footer still links to Services.
 */
export const SITE_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Terms & Conditions', to: '/terms' },
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Contact', to: '/contact' },
];
