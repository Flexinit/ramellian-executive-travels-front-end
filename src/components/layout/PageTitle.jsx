import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Ramellian Executive Travels';

/**
 * Sets the browser tab `<title>` for the current route via react-helmet-async
 * (implementation-plan.md 12.5). Drop one at the top of every page.
 *
 * @param {string} title — page-specific title; omit for the bare site name (e.g. HomePage)
 */
export default function PageTitle({ title }) {
  return (
    <Helmet>
      <title>{title ? `${title} | ${SITE_NAME}` : SITE_NAME}</title>
    </Helmet>
  );
}
