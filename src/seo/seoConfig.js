/**
 * Search (SEO) and answer-engine (AEO) settings, shared by the running app (components/layout/PageTitle.jsx — the
 * tags change as the visitor moves around) and the build (vite-plugins/seo.js — a real HTML file per public page,
 * plus sitemap.xml, robots.txt and llms.txt). Plain JS, no JSX or `@/` imports: vite.config.js loads it in Node.
 *
 * Business contact details (phone, email, address, social profiles) come from the platform settings, which an
 * administrator fills in under Platform Settings → Contact & social — only what's actually set is published.
 */
import { FAQS } from '../content/siteContent.js';

export const SITE_URL = 'https://ramellianexecutivetravels.co.ke';
export const SITE_NAME = 'Ramellian Executive Travels';
/** 1200×630 share image (public/og-image.jpg) — WhatsApp, Facebook, X, LinkedIn previews. */
export const OG_IMAGE = '/og-image.jpg';
export const LOGO = '/brand-logo-1024-transparent.png';

export const DEFAULT_DESCRIPTION =
  'Chauffeured and self-drive car hire in Nairobi, Kenya. Airport transfers at JKIA, corporate transport, weddings, safaris and long-distance trips — see prices and book online.';

/**
 * The public pages — each gets its own title, description and HTML at build, and a sitemap entry. Titles stay under
 * ~60 characters and descriptions under ~160, the lengths search results show in full.
 */
export const PUBLIC_PAGES = [
  {
    path: '/',
    title: 'Car Hire & Chauffeur Services in Nairobi',
    description: DEFAULT_DESCRIPTION,
    priority: 1.0,
    changefreq: 'daily',
  },
  {
    path: '/vehicles',
    title: 'Browse Cars for Hire in Nairobi',
    description:
      'Self-drive and chauffeured cars for hire in Nairobi — SUVs, executive saloons and people carriers. See daily rates and availability for your dates, then book online.',
    priority: 0.9,
    changefreq: 'daily',
  },
  {
    path: '/services',
    title: 'Chauffeur, Airport Transfer & Corporate Car Services',
    description:
      'Corporate transport, JKIA airport transfers, wedding and event cars, long-distance and safari trips, conference fleets and secure journey management in Nairobi.',
    priority: 0.8,
    changefreq: 'monthly',
  },
  {
    path: '/fleet',
    title: 'Our Fleet — Executive Cars for Hire in Nairobi',
    description:
      'Every vehicle Ramellian Executive Travels offers in Nairobi, with seats, transmission and daily rate. Self-drive or with a chauffeur.',
    priority: 0.8,
    changefreq: 'daily',
  },
  {
    path: '/faq',
    title: 'Car Hire FAQs — Documents, Payment, Delivery & Cancellation',
    description:
      'Answers about hiring a car in Nairobi with Ramellian: documents needed, self-drive vs chauffeured, delivery, paying online, cancellation, insurance and listing your own car.',
    priority: 0.7,
    changefreq: 'monthly',
  },
  {
    path: '/about',
    title: 'About Us — Executive Car Hire in Nairobi',
    description:
      'Ramellian Executive Travels: chauffeured hire and self-drive rentals across Nairobi and beyond, with vetted chauffeurs, insured vehicles and secure online payments.',
    priority: 0.6,
    changefreq: 'yearly',
  },
  {
    path: '/contact',
    title: 'Contact Us — Quotes & Bookings',
    description: 'Ask about a booking, request a custom quote or set up a corporate account with Ramellian Executive Travels, Nairobi.',
    priority: 0.6,
    changefreq: 'yearly',
  },
  {
    path: '/terms',
    title: 'Terms & Conditions',
    description: 'The terms for renting and listing vehicles on Ramellian Executive Travels.',
    priority: 0.3,
    changefreq: 'yearly',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    description: 'How Ramellian Executive Travels collects, uses and protects your personal information.',
    priority: 0.3,
    changefreq: 'yearly',
  },
];

/** Signed-in areas and steps of a booking: never indexed (robots.txt keeps crawlers out; pages say noindex). */
export const PRIVATE_PREFIXES = [
  '/dashboard', '/owner', '/admin', '/auth', '/booking', '/book', '/messages', '/inbox', '/assistant', '/payment',
  '/contracts', '/dev',
];

export function isPrivatePath(path) {
  return PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export const absoluteUrl = (path) => (/^https?:/i.test(path) ? path : `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`);

/** "Title | Ramellian Executive Travels" — the home page is just its own title plus the name. */
export const fullTitle = (title) => (title ? `${title} | ${SITE_NAME}` : SITE_NAME);

// ─── Contact links ─────────────────────────────────────────────────────────────────────────────────────────────

/** A WhatsApp number as a wa.me link ("+254 712 345 678" → https://wa.me/254712345678); a full link is kept as is. */
export function whatsappLink(value) {
  const v = String(value || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const digits = v.replace(/\D/g, '').replace(/^0(?=7|1)/, '254');
  return digits ? `https://wa.me/${digits}` : null;
}

/** "@ramellian" or "ramellian" → a full profile address on that network; a full link is kept as is. */
export function socialLink(key, value) {
  const v = String(value || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '');
  const base = { facebook: 'https://facebook.com/', instagram: 'https://instagram.com/', xTwitter: 'https://x.com/', tiktok: 'https://www.tiktok.com/@' }[key];
  return base ? `${base}${handle}` : null;
}

// ─── Structured data (schema.org JSON-LD) ──────────────────────────────────────────────────────────────────────

/**
 * The business: a car rental in Nairobi (shown in Google's business results and quoted by answer engines).
 * @param {object} [contact] — `PlatformSettingsResponse`: its supportPhone, supportEmail, address and social links
 */
export function businessJsonLd(contact = {}) {
  const c = contact || {};
  const sameAs = ['facebook', 'instagram', 'xTwitter', 'tiktok'].map((k) => socialLink(k, c[k])).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoRental',
    '@id': `${SITE_URL}/#business`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl(LOGO),
    image: absoluteUrl(OG_IMAGE),
    description: DEFAULT_DESCRIPTION,
    address: { '@type': 'PostalAddress', ...(c.address ? { streetAddress: c.address } : {}), addressLocality: 'Nairobi', addressCountry: 'KE' },
    ...(c.supportPhone ? { telephone: c.supportPhone } : {}),
    ...(c.supportEmail ? { email: c.supportEmail } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    areaServed: [
      { '@type': 'City', name: 'Nairobi' },
      { '@type': 'Country', name: 'Kenya' },
    ],
    currenciesAccepted: 'KES',
    paymentAccepted: 'Online payment (Pesapal)',
    knowsAbout: ['Car hire', 'Chauffeur services', 'Airport transfers', 'Self-drive car rental', 'Corporate transport', 'Wedding cars', 'Safari transport'],
  };
}

/** The website, so engines know its name and where search lives. */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#business` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/vehicles?query={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** The FAQs as question/answer pairs — what answer engines lift straight into their replies. */
export function faqJsonLd(faqs = FAQS) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

/** Home › … › this page. `trail` is `[{ name, path }]`. */
export function breadcrumbJsonLd(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: absoluteUrl(t.path) })),
  };
}

/** The services as offers of the business. */
export function servicesJsonLd(services) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Services',
    itemListElement: services.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Service',
        name: s.title,
        description: `${s.summary} ${s.details}`,
        url: absoluteUrl(`/services#${s.id}`),
        areaServed: { '@type': 'City', name: 'Nairobi' },
        provider: { '@id': `${SITE_URL}/#business` },
      },
    })),
  };
}

// ─── Vehicles ──────────────────────────────────────────────────────────────────────────────────────────────────

const cap = (s) => (s ? String(s).charAt(0) + String(s).slice(1).toLowerCase().replace(/_/g, ' ') : '');
const fileName = (u) => (typeof u === 'string' ? u.split(/[?#]/)[0].split('/').pop() : '');

/** A vehicle's real photos — never its insurance sticker, which the backend lists among them (backend item 46). */
export function vehiclePhotos(v) {
  const sticker = fileName(v?.insuranceVerificationStickerPhoto);
  return (Array.isArray(v?.photoUrls) ? v.photoUrls : []).filter((u) => u && (!sticker || fileName(u) !== sticker));
}

/** How a vehicle is offered, in words — the page description and the start of its summary. */
export function vehicleDescription(v) {
  const modes = [v?.selfDrive && 'self-drive', v?.chauffeured && 'with a chauffeur'].filter(Boolean).join(' or ');
  const specs = [v?.capacity && `${v.capacity} seats`, v?.transmissionType && cap(v.transmissionType), v?.fuelType && cap(v.fuelType)]
    .filter(Boolean)
    .join(', ');
  const price = v?.pricePerDay != null ? ` From KES ${Number(v.pricePerDay).toLocaleString('en-KE')} per day.` : '';
  return `${v?.model || 'Vehicle'} for hire${v?.location ? ` in ${v.location}` : ' in Nairobi'}${modes ? `, ${modes}` : ''}${specs ? ` — ${specs}` : ''}.${price} Book online with ${SITE_NAME}.`;
}

/** A vehicle as a product with a daily-rate offer. */
export function vehicleJsonLd(v) {
  const url = absoluteUrl(`/vehicles/${v.id}`);
  const photos = vehiclePhotos(v).map(absoluteUrl);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#vehicle`,
    name: `${v.model} — car hire${v.location ? ` in ${v.location}` : ''}`,
    category: 'Car hire',
    description: vehicleDescription(v),
    ...(photos.length ? { image: photos } : {}),
    url,
    ...(v.pricePerDay != null
      ? {
          offers: {
            '@type': 'Offer',
            url,
            priceCurrency: 'KES',
            price: Number(v.pricePerDay),
            priceSpecification: { '@type': 'UnitPriceSpecification', price: Number(v.pricePerDay), priceCurrency: 'KES', unitText: 'DAY' },
            availability: v.available === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
            seller: { '@id': `${SITE_URL}/#business` },
          },
        }
      : {}),
  };
}

/** The structured data each public page carries (vehicle pages add their own). */
export function pageJsonLd(path, { services, contact } = {}) {
  const page = PUBLIC_PAGES.find((p) => p.path === path);
  const crumbs = path === '/' ? [] : [breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: page?.title || path, path }])];
  if (path === '/') return [businessJsonLd(contact), websiteJsonLd()];
  if (path === '/faq') return [faqJsonLd(), ...crumbs];
  if (path === '/services' && services) return [servicesJsonLd(services), ...crumbs];
  if (path === '/about' || path === '/contact') return [businessJsonLd(contact), ...crumbs];
  return crumbs;
}
