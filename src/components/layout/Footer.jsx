import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail } from 'lucide-react';
import { useContactDetails } from '../../hooks/usePlatformSettings';
import Logo from '../ui/Logo';

const COLUMNS = [
  {
    heading: 'Services',
    links: [
      { label: 'Corporate Transport', to: '/services#corporate' },
      { label: 'Airport Transfers', to: '/services#airport' },
      { label: 'Events & Weddings', to: '/services#weddings' },
      { label: 'Long-Distance Routes', to: '/services#long-distance' },
      { label: 'Conferences & Business Meetings', to: '/services#conferences' },
      { label: 'Secure Journey Management', to: '/services#secure' },
    ],
  },
  {
    heading: 'Vehicles',
    links: [
      { label: 'Browse All', to: '/vehicles' },
      { label: 'Self-Drive', to: '/vehicles?selfDrive=true' },
      { label: 'Chauffeured', to: '/vehicles?chauffeured=true' },
      { label: 'Standard Fleet', to: '/vehicles?tier=standard' },
      { label: 'Executive Fleet', to: '/vehicles?tier=executive' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'FAQ', to: '/faq' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
    ],
  },
];

/**
 * Global site footer — brand + location column, 3 link columns, copyright bar.
 * Structure follows the otto.rentals-inspired layout in
 * docs/menu-structure.md §7; copy is original, not sourced from any live
 * Ramellian marketing site. Detailed contact channels (phone, WhatsApp)
 * belong on the dedicated Contact page (Phase 11), not hardcoded here.
 *
 * `compact` keeps only one slim line — the copyright and the Privacy Policy / Terms of Service links, which
 * should stay reachable from every public page — for a page that should be about its own content alone
 * (Browse Vehicles: cars only, no company columns under them).
 * @param {boolean} [compact]
 */
export default function Footer({ compact = false }) {
  // The business's phone, email, address and social links, as set under Platform Settings → Contact & social —
  // shown only once set (never placeholders).
  const contact = useContactDetails();
  const year = new Date().getFullYear();

  if (compact) {
    return (
      <footer className="bg-surface border-t border-ink/10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-muted text-xs">
          <p>© {year} Ramellian Executive Travels. All rights reserved.</p>
          <nav aria-label="Legal" className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-ink transition-colors focus-ring rounded-md">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-ink transition-colors focus-ring rounded-md">Terms of Service</Link>
          </nav>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-surface border-t border-ink/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 grid gap-10 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo size="md" />
          <p className="text-muted text-sm max-w-xs leading-relaxed">
            Executive chauffeur and self-drive rentals across Nairobi.
          </p>
          <div className="flex flex-col gap-2 text-sm text-muted">
            <span className="inline-flex items-center gap-2">
              <MapPin size={14} aria-hidden="true" />
              {contact.address || 'Nairobi, Kenya'}
            </span>
            {contact.phone && (
              <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2 hover:text-accent transition-colors focus-ring rounded-md w-fit">
                <Phone size={14} aria-hidden="true" />
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 hover:text-accent transition-colors focus-ring rounded-md w-fit [overflow-wrap:anywhere]">
                <Mail size={14} aria-hidden="true" />
                {contact.email}
              </a>
            )}
            <Link
              to="/contact"
              className="hover:text-accent transition-colors focus-ring rounded-md w-fit"
            >
              Contact Us
            </Link>
            {contact.socials.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                {contact.socials.map((social) => (
                  <a key={social.key} href={social.href} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors focus-ring rounded-md">
                    {social.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <h3 className="font-heading text-brand-gold-deep text-sm font-semibold uppercase tracking-wider mb-5">
              {col.heading}
            </h3>
            <ul className="flex flex-col gap-3">
              {col.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-muted text-sm hover:text-ink transition-colors focus-ring rounded-md"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-ink/10">
        <p className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-muted text-xs text-center sm:text-left">
          © {year} Ramellian Executive Travels. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
