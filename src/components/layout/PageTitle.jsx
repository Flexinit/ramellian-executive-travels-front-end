import React, { useContext } from 'react';
import { QueryClientContext } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import {
  DEFAULT_DESCRIPTION,
  OG_IMAGE,
  PUBLIC_PAGES,
  SITE_NAME,
  absoluteUrl,
  fullTitle,
  isPrivatePath,
  pageJsonLd,
} from '../../seo/seoConfig';
import { SERVICES } from '../../content/siteContent';

/** A vehicle's own page — public and worth indexing, though not in the fixed list. */
const isVehiclePage = (path) => /^\/vehicles\/[^/]+$/.test(path);

/**
 * The page's `<head>`: title, description, canonical address, link-preview (Open Graph / Twitter) tags, whether
 * search engines may index it, and its structured data (JSON-LD) — from src/seo/seoConfig.js, so the running app
 * says exactly what the build's per-page HTML says (vite-plugins/seo.js). Drop one at the top of every page.
 *
 * The public pages (seoConfig's PUBLIC_PAGES) and vehicle pages are indexable; everything else — signed-in areas,
 * booking steps, sign-in pages, unknown addresses — is `noindex`.
 *
 * @param {string} [title] — the page's title; a public page uses its search title from seoConfig instead
 * @param {string} [description] — overrides the page's description (vehicle pages)
 * @param {string} [image] — share image for previews (vehicle pages: a photo of the car)
 * @param {object|object[]} [jsonLd] — extra structured data (vehicle pages)
 */
export default function PageTitle({ title, description, image, jsonLd }) {
  const { pathname } = useLocation();
  const page = PUBLIC_PAGES.find((p) => p.path === pathname);
  const indexable = !!page || isVehiclePage(pathname);
  const text = page ? (page.path === '/' ? `${page.title} | ${SITE_NAME}` : fullTitle(page.title)) : fullTitle(title);
  const desc = description || page?.description || DEFAULT_DESCRIPTION;
  const url = absoluteUrl(pathname);
  const img = absoluteUrl(image || OG_IMAGE);
  // The business's contact details, if the app has the platform settings already (the Contact page and footer load
  // them) — read from the cache, not fetched here.
  const contact = useContext(QueryClientContext)?.getQueryData(['platform-settings']);
  const data = [...(page ? pageJsonLd(pathname, { services: SERVICES, contact }) : []), ...[].concat(jsonLd || [])];

  return (
    <Helmet>
      <title>{text}</title>
      <meta name="description" content={desc} />
      <meta name="robots" content={indexable && !isPrivatePath(pathname) ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'} />
      {indexable && <link rel="canonical" href={url} />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="en_KE" />
      <meta property="og:title" content={text} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={text} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
      {data.map((d, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(d)}</script>
      ))}
    </Helmet>
  );
}
