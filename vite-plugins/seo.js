/**
 * Search (SEO) and answer-engine (AEO) output, written after every `vite build`:
 *
 *  - a real HTML file for each public page (dist/<path>/index.html, the home page as dist/index.html) and for each
 *    vehicle (dist/vehicles/<id>/index.html): the page's own title, description, canonical address, link-preview tags
 *    and structured data, and its actual words inside #root — crawlers, link previews and AI answer engines that
 *    don't run JavaScript read real content; for visitors the app replaces it as soon as it starts;
 *  - dist/app-shell.html: the bare app, `noindex`, served for every other address (signed-in areas, booking steps);
 *  - sitemap.xml, robots.txt and llms.txt (a plain summary written for AI engines).
 *
 * Vehicles come from the live API (`SEO_API_URL`, else `VITE_API_BASE_URL`) at build time; if it can't be reached the
 * build carries on without them (they're still found through the app and the sitemap's /vehicles page).
 * The words come from src/content/siteContent.js and the settings from src/seo/seoConfig.js — the same files the
 * running app uses, so the two never disagree. Nginx serves these files first (deploy/nginx/ramellian-locations.conf).
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_DESCRIPTION,
  OG_IMAGE,
  PRIVATE_PREFIXES,
  PUBLIC_PAGES,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  breadcrumbJsonLd,
  fullTitle,
  pageJsonLd,
  vehicleDescription,
  vehicleJsonLd,
  vehiclePhotos,
} from '../src/seo/seoConfig.js';
import { ABOUT_STORY, FAQS, SERVICES, VALUES } from '../src/content/siteContent.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// JSON inside <script>: `</` must not close the tag early.
const jsonForScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

/** The head tags for one page. `data-rh` lets react-helmet-async take them over once the app starts (no duplicates). */
export function headTags({ title, description, path, image, jsonLd = [], indexable = true }) {
  const url = absoluteUrl(path);
  const img = absoluteUrl(image || OG_IMAGE);
  const tags = [
    `<meta data-rh="true" name="description" content="${esc(description)}" />`,
    `<meta data-rh="true" name="robots" content="${indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'}" />`,
    indexable && `<link data-rh="true" rel="canonical" href="${esc(url)}" />`,
    `<meta data-rh="true" property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta data-rh="true" property="og:type" content="website" />`,
    `<meta data-rh="true" property="og:locale" content="en_KE" />`,
    `<meta data-rh="true" property="og:title" content="${esc(title)}" />`,
    `<meta data-rh="true" property="og:description" content="${esc(description)}" />`,
    `<meta data-rh="true" property="og:url" content="${esc(url)}" />`,
    `<meta data-rh="true" property="og:image" content="${esc(img)}" />`,
    `<meta data-rh="true" name="twitter:card" content="summary_large_image" />`,
    `<meta data-rh="true" name="twitter:title" content="${esc(title)}" />`,
    `<meta data-rh="true" name="twitter:description" content="${esc(description)}" />`,
    `<meta data-rh="true" name="twitter:image" content="${esc(img)}" />`,
    ...jsonLd.map((d) => `<script data-rh="true" type="application/ld+json">${jsonForScript(d)}</script>`),
  ];
  return tags.filter(Boolean).join('\n    ');
}

/** The template with this page's title, head tags and content put in. */
export function renderPage(template, { title, body, ...meta }) {
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace('</head>', `    ${headTags({ title, ...meta })}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body || ''}</div>`);
}

// ─── The words on each page (simple, semantic HTML — the app replaces it on load) ────────────────────────────────

const nav = `<nav aria-label="Site"><a href="/">${esc(SITE_NAME)}</a> · <a href="/vehicles">Vehicles</a> · <a href="/services">Services</a> · <a href="/fleet">Fleet</a> · <a href="/faq">FAQ</a> · <a href="/about">About</a> · <a href="/contact">Contact</a></nav>`;
const footer = `<footer><p>${esc(SITE_NAME)} — chauffeured and self-drive car hire in Nairobi, Kenya.</p><p><a href="/terms">Terms &amp; Conditions</a> · <a href="/privacy">Privacy Policy</a></p></footer>`;
const wrap = (inner) => `${nav}<main>${inner}</main>${footer}`;
const faqHtml = (faqs) => faqs.map((f) => `<section><h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p></section>`).join('');
const servicesHtml = SERVICES.map((s) => `<section id="${s.id}"><h2>${esc(s.title)}</h2><p>${esc(s.summary)}</p><p>${esc(s.details)}</p></section>`).join('');
const vehicleList = (vehicles) =>
  vehicles.length
    ? `<ul>${vehicles.map((v) => `<li><a href="/vehicles/${esc(v.id)}">${esc(v.model)}</a> — ${esc(vehicleDescription(v))}</li>`).join('')}</ul>`
    : '<p><a href="/vehicles">See every vehicle and its daily rate</a>.</p>';

const HOW_IT_WORKS = [
  ['Choose your vehicle and dates', 'Search by location, date and travel mode to find the right fit from our fleet.'],
  ['Confirm and pay securely', 'Review your contract and pay safely online — no cash, no hassle.'],
  ['Enjoy your executive ride', 'Your vehicle or chauffeur arrives on time, every time, tracked from start to finish.'],
];
const WHY = [
  ['Vetted chauffeurs', 'Every driver is background-checked and professionally trained.'],
  ['Secure payments', 'Encrypted online checkout, no cash handling required.'],
  ['24/7 support', 'Real people on call for every trip, day or night.'],
  ['Fully insured fleet', 'Every vehicle covered by comprehensive insurance, every journey protected.'],
];

function pageBody(path, vehicles) {
  const page = PUBLIC_PAGES.find((p) => p.path === path);
  switch (path) {
    case '/':
      return wrap(
        `<h1>${esc(page.title)}</h1><p>Executive travel, reimagined: chauffeured luxury and self-drive car rentals in Nairobi, booked in minutes. ${esc(DEFAULT_DESCRIPTION)}</p>` +
          `<p><a href="/vehicles">Browse vehicles</a> · <a href="/contact?type=quote">Request a quote</a></p>` +
          `<h2>Our services</h2><ul>${SERVICES.map((s) => `<li><a href="/services#${s.id}">${esc(s.title)}</a> — ${esc(s.summary)}</li>`).join('')}</ul>` +
          `<h2>Booking in three simple steps</h2><ol>${HOW_IT_WORKS.map(([t, d]) => `<li><strong>${esc(t)}</strong> — ${esc(d)}</li>`).join('')}</ol>` +
          `<h2>Why Ramellian</h2><ul>${WHY.map(([t, d]) => `<li><strong>${esc(t)}</strong> — ${esc(d)}</li>`).join('')}</ul>` +
          `<h2>Vehicles available now</h2>${vehicleList(vehicles)}` +
          `<h2>Frequently asked questions</h2>${faqHtml(FAQS.slice(0, 6))}<p><a href="/faq">More answers</a></p>`
      );
    case '/vehicles':
    case '/fleet':
      return wrap(`<h1>${esc(page.title)}</h1><p>${esc(page.description)}</p>${vehicleList(vehicles)}`);
    case '/services':
      return wrap(`<h1>Our Services</h1><p>Six ways Ramellian gets you where you need to be — chauffeured or self-drive.</p>${servicesHtml}<p><a href="/contact?type=quote">Request a custom quote</a></p>`);
    case '/faq':
      return wrap(`<h1>Frequently Asked Questions</h1>${faqHtml(FAQS)}`);
    case '/about':
      return wrap(`<h1>About ${esc(SITE_NAME)}</h1>${ABOUT_STORY.map((p) => `<p>${esc(p)}</p>`).join('')}<h2>What we value</h2><ul>${VALUES.map((v) => `<li><strong>${esc(v.title)}</strong> — ${esc(v.description)}</li>`).join('')}</ul>`);
    case '/contact':
      return wrap(`<h1>Contact Us</h1><p>Questions, custom quotes or corporate accounts — send us a message from this page and our team typically replies within one business day. We're based in Nairobi, Kenya.</p>`);
    default:
      return wrap(`<h1>${esc(page?.title || SITE_NAME)}</h1><p>${esc(page?.description || '')}</p>`);
  }
}

/** AUTOMATIC → Automatic, SELF_DRIVE → Self drive. */
const words = (s) => String(s).charAt(0) + String(s).slice(1).toLowerCase().replace(/_/g, ' ');

function vehicleBody(v) {
  const photos = vehiclePhotos(v).slice(0, 4);
  const facts = [
    v.location && ['Location', v.location],
    v.capacity && ['Seats', v.capacity],
    v.transmissionType && ['Transmission', words(v.transmissionType)],
    v.fuelType && ['Fuel', words(v.fuelType)],
    ['Driving', [v.selfDrive && 'Self-drive', v.chauffeured && 'Chauffeured'].filter(Boolean).join(', ') || '—'],
    v.pricePerDay != null && ['Price', `KES ${Number(v.pricePerDay).toLocaleString('en-KE')} per day`],
  ].filter(Boolean);
  return wrap(
    `<h1>${esc(v.model)} for hire${v.location ? ` in ${esc(v.location)}` : ''}</h1><p>${esc(vehicleDescription(v))}</p>` +
      (v.description ? `<p>${esc(v.description)}</p>` : '') +
      `<dl>${facts.map(([k, val]) => `<dt>${esc(k)}</dt><dd>${esc(val)}</dd>`).join('')}</dl>` +
      photos.map((u) => `<img src="${esc(absoluteUrl(u))}" alt="${esc(v.model)}" width="640" loading="lazy" />`).join('') +
      `<p><a href="/vehicles">All vehicles</a></p>`
  );
}

// ─── Vehicles from the live API ─────────────────────────────────────────────────────────────────────────────────

/** The platform settings — for the business's contact details. Null if they can't be read (the build carries on). */
async function fetchSettings(apiBase, log) {
  if (!apiBase) return null;
  try {
    const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/v1/platform-settings`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    log(`couldn't read the contact details from ${apiBase} (${error.message}) — business data without them`);
    return null;
  }
}

async function fetchVehicles(apiBase, log) {
  if (!apiBase) {
    log('no API address (SEO_API_URL / VITE_API_BASE_URL) — vehicle pages skipped');
    return [];
  }
  const all = [];
  try {
    for (let page = 0; page < 20; page += 1) {
      const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/v1/vehicles?page=${page}&size=100`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.content || [];
      all.push(...items);
      if (Array.isArray(data) || data.last !== false || items.length === 0) break;
    }
  } catch (error) {
    log(`couldn't read vehicles from ${apiBase} (${error.message}) — vehicle pages skipped`);
    return [];
  }
  return all.filter((v) => v && v.id && v.model && v.available !== false);
}

// ─── sitemap.xml, robots.txt, llms.txt ────────────────────────────────────────────────────────────────────────

function sitemap(vehicles, today) {
  const urls = [
    ...PUBLIC_PAGES.map((p) => ({ loc: absoluteUrl(p.path), changefreq: p.changefreq, priority: p.priority })),
    ...vehicles.map((v) => ({ loc: absoluteUrl(`/vehicles/${v.id}`), changefreq: 'weekly', priority: 0.7 })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${esc(u.loc)}</loc><lastmod>${today}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority.toFixed(1)}</priority></url>`)
    .join('\n')}\n</urlset>\n`;
}

function robots() {
  return [
    '# Search engines and AI answer engines are welcome on the public pages.',
    'User-agent: *',
    'Allow: /',
    // A prefix covers the page and everything under it (no public page starts with one of these).
    ...PRIVATE_PREFIXES.map((p) => `Disallow: ${p}`),
    'Disallow: /api/',
    'Disallow: /app-shell.html',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n');
}

function llmsTxt(vehicles) {
  const page = (p) => PUBLIC_PAGES.find((x) => x.path === p);
  return [
    `# ${SITE_NAME}`,
    '',
    `> ${DEFAULT_DESCRIPTION}`,
    '',
    `${SITE_NAME} is a car hire and chauffeur service based in Nairobi, Kenya. Renters can hire vehicles self-drive or with a vetted chauffeur, see the full price before paying, and pay securely online. Vehicle owners can list their cars for hire. All listed vehicles carry comprehensive insurance.`,
    '',
    '## Pages',
    ...['/vehicles', '/services', '/fleet', '/faq', '/about', '/contact'].map((p) => `- [${page(p).title}](${absoluteUrl(p)}): ${page(p).description}`),
    '',
    '## Services',
    ...SERVICES.map((s) => `- [${s.title}](${absoluteUrl(`/services#${s.id}`)}): ${s.summary} ${s.details}`),
    '',
    '## Frequently asked questions',
    ...FAQS.flatMap((f) => [`### ${f.question}`, f.answer, '']),
    ...(vehicles.length
      ? ['## Vehicles', ...vehicles.map((v) => `- [${v.model}](${absoluteUrl(`/vehicles/${v.id}`)}): ${vehicleDescription(v)}`), '']
      : []),
    '## Optional',
    `- [Terms & Conditions](${absoluteUrl('/terms')})`,
    `- [Privacy Policy](${absoluteUrl('/privacy')})`,
    '',
  ].join('\n');
}

// ─── The plugin ───────────────────────────────────────────────────────────────────────────────────────────────

/** @param {{ apiBase?: string }} options */
export default function seo({ apiBase } = {}) {
  let outDir = 'dist';
  return {
    name: 'ramellian-seo',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const log = (m) => console.log(`[seo] ${m}`);
      const indexFile = path.join(outDir, 'index.html');
      if (!fs.existsSync(indexFile)) return;
      const template = fs.readFileSync(indexFile, 'utf8');
      const write = (rel, content) => {
        const file = path.join(outDir, rel);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);
      };

      const [vehicles, contact] = await Promise.all([fetchVehicles(apiBase, log), fetchSettings(apiBase, log)]);

      // Everything that isn't a public page: the bare app, never indexed.
      write('app-shell.html', renderPage(template, { title: SITE_NAME, description: DEFAULT_DESCRIPTION, path: '/', indexable: false, body: '' }));
      // A vehicle added since this build has no page of its own yet: a neutral shell (no noindex — the app sets its
      // title, description and canonical once it has loaded the vehicle, and Google renders it).
      write('vehicle-shell.html', template.replace('<div id="root"></div>', `<div id="root">${wrap('<p><a href="/vehicles">See every vehicle for hire</a>.</p>')}</div>`));

      for (const p of PUBLIC_PAGES) {
        const html = renderPage(template, {
          title: p.path === '/' ? `${p.title} | ${SITE_NAME}` : fullTitle(p.title),
          description: p.description,
          path: p.path,
          jsonLd: pageJsonLd(p.path, { services: SERVICES, contact }),
          body: pageBody(p.path, vehicles),
        });
        write(p.path === '/' ? 'index.html' : path.join(p.path.slice(1), 'index.html'), html);
      }

      for (const v of vehicles) {
        const vehiclePath = `/vehicles/${v.id}`;
        write(path.join('vehicles', String(v.id), 'index.html'), renderPage(template, {
          title: fullTitle(`${v.model} for Hire${v.location ? ` in ${v.location}` : ''}`),
          description: vehicleDescription(v),
          path: vehiclePath,
          image: vehiclePhotos(v)[0],
          jsonLd: [vehicleJsonLd(v), breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Vehicles', path: '/vehicles' }, { name: v.model, path: vehiclePath }])],
          body: vehicleBody(v),
        }));
      }

      const today = new Date().toISOString().slice(0, 10);
      write('sitemap.xml', sitemap(vehicles, today));
      write('robots.txt', robots());
      write('llms.txt', llmsTxt(vehicles));
      log(`wrote ${PUBLIC_PAGES.length} pages, ${vehicles.length} vehicle pages, sitemap.xml, robots.txt, llms.txt`);
    },
  };
}
