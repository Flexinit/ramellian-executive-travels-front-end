# Search & AI answer engines (SEO / AEO)

How the site gets found on Google and Bing, and quoted by AI answer engines (ChatGPT, Perplexity, Gemini, Claude).

## What the site does by itself

The site is a React app, so before 2026-10-26 every address returned the same empty page until JavaScript ran.
Google renders JavaScript, but Bing often doesn't, link previews (WhatsApp, Facebook, X, LinkedIn) never do, and
AI crawlers mostly don't. Now:

| What | Where |
|---|---|
| A real HTML file for every public page (`/`, `/vehicles`, `/services`, `/fleet`, `/faq`, `/about`, `/contact`, `/terms`, `/privacy`) with its own title, description, canonical address, link-preview tags, structured data and its actual text | written by the build: `vite-plugins/seo.js` |
| A real HTML file for every available vehicle (`/vehicles/<id>`): name, description, photos (never the insurance sticker), daily rate | same; vehicles are read from the live API during the build |
| `sitemap.xml`, `robots.txt` (private areas kept out), `llms.txt` (a plain summary for AI engines) | same |
| Per-page title/description/canonical/`noindex` as the visitor moves around the app | `src/components/layout/PageTitle.jsx` |
| Structured data: the business (`AutoRental`, Nairobi), website + search, FAQ questions and answers, services, each vehicle as a product with a per-day KES offer, breadcrumbs | `src/seo/seoConfig.js` |
| Share image for link previews (1200×630) | `public/og-image.jpg` |
| Page words shared by the pages and the build (FAQs, services, about) | `src/content/siteContent.js` |
| Serving: a built page first, a `noindex` app shell for signed-in areas, a neutral shell for vehicles added since the last build | `deploy/nginx/ramellian-locations.conf` |

Signed-in areas, booking steps and sign-in pages are `noindex` and disallowed in `robots.txt`.

**Vehicle pages are written at build time.** A vehicle added later still works (the app fills it in and Google
renders it), but it only gets its own HTML file and sitemap entry on the next deploy.

**To change page titles or descriptions:** `PUBLIC_PAGES` in `src/seo/seoConfig.js`. **FAQs, services, about text:**
`src/content/siteContent.js`. Keep FAQ answers true to what the portal does; answer engines quote them word for word.

## What needs a person (not code)

1. **Real contact details.** Fill in **Platform Settings → Contact & social** (phone, WhatsApp, email, address,
   social profiles). The Contact page and footer show them, and the business's structured data includes them
   (`telephone`, `email`, `streetAddress`, `sameAs`) — in the app straight away, and in the built HTML on the next
   deploy. Nothing that's left empty is published.
2. **Google Search Console** (search.google.com/search-console): add the domain `ramellianexecutivetravels.co.ke`,
   verify it with the DNS record it gives you, then submit `https://ramellianexecutivetravels.co.ke/sitemap.xml`.
   Use **URL inspection → Request indexing** on the home page, `/vehicles`, `/services` and `/faq`.
3. **Bing Webmaster Tools** (bing.com/webmasters): import from Search Console. Bing also feeds ChatGPT search and
   Copilot.
4. **Google Business Profile** (business.google.com): create the listing as a car rental / chauffeur service in
   Nairobi with the real phone, hours, photos and the website. This drives "car hire near me" and map results more
   than anything on the site itself.
5. **Reviews.** Ask happy renters to review the Business Profile. The structured data has no rating yet; add an
   `aggregateRating` once vehicles have real review counts.
6. **Real prices.** Live vehicles are priced at KES 1/day (test data), and that's what search results will show.
7. **Links from elsewhere:** Kenyan directories, hotel/event partners, wedding planners, social profiles (add their URLs
   as `sameAs` in `businessJsonLd()`).
8. **New content over time:** one page per service people search for (e.g. "JKIA airport transfer", "wedding car hire
   Nairobi", "self-drive car hire Nairobi") ranks better than one page covering all of them.

## Checking it

- **Rich results test:** search.google.com/test/rich-results with any public address.
- **Link preview:** paste a link into WhatsApp, or use the Facebook sharing debugger.
- **What a crawler sees:** `curl https://ramellianexecutivetravels.co.ke/faq` should show the questions in the HTML.
