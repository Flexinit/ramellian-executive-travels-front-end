// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import PageTitle from './PageTitle';

function renderTitle(props, route = '/somewhere') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[route]}>
        <PageTitle {...props} />
      </MemoryRouter>
    </HelmetProvider>
  );
}

const meta = (selector) => document.head.querySelector(selector)?.getAttribute('content');
const jsonLd = () => [...document.head.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent));

describe('PageTitle', () => {
  it('sets the document title with the site name suffix', async () => {
    renderTitle({ title: 'My Bookings' }, '/dashboard/bookings');
    await waitFor(() => expect(document.title).toBe('My Bookings | Ramellian Executive Travels'));
  });

  it('falls back to the bare site name when no title is given', async () => {
    renderTitle({}, '/dashboard');
    await waitFor(() => expect(document.title).toBe('Ramellian Executive Travels'));
  });

  it('gives a public page its search title, description, canonical address and preview tags', async () => {
    renderTitle({ title: 'Our Services' }, '/services');
    await waitFor(() => expect(document.title).toMatch(/^Chauffeur, Airport Transfer & Corporate Car Services \| Ramellian/));
    expect(meta('meta[name="description"]')).toMatch(/JKIA airport transfers/);
    expect(meta('meta[name="robots"]')).toMatch(/^index, follow/);
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://ramellianexecutivetravels.co.ke/services');
    expect(meta('meta[property="og:image"]')).toBe('https://ramellianexecutivetravels.co.ke/og-image.jpg');
    expect(jsonLd().some((d) => d['@type'] === 'ItemList')).toBe(true);
  });

  it('marks the FAQ page up as questions and answers', async () => {
    renderTitle({ title: 'FAQ' }, '/faq');
    await waitFor(() => expect(jsonLd().find((d) => d['@type'] === 'FAQPage')?.mainEntity.length).toBeGreaterThan(5));
  });

  it('keeps signed-in areas and booking steps out of search results', async () => {
    renderTitle({ title: 'Checkout' }, '/booking/checkout');
    await waitFor(() => expect(meta('meta[name="robots"]')).toBe('noindex, nofollow'));
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it("lets a vehicle page set its own description, image and structured data", async () => {
    renderTitle({ title: 'Toyota Prado for Hire', description: 'Toyota Prado for hire in Nairobi.', image: '/uploads/vehicles/a.jpg', jsonLd: { '@type': 'Product', name: 'Toyota Prado' } }, '/vehicles/v1');
    await waitFor(() => expect(meta('meta[name="description"]')).toBe('Toyota Prado for hire in Nairobi.'));
    expect(meta('meta[name="robots"]')).toMatch(/^index/);
    expect(meta('meta[property="og:image"]')).toBe('https://ramellianexecutivetravels.co.ke/uploads/vehicles/a.jpg');
    expect(jsonLd().some((d) => d['@type'] === 'Product')).toBe(true);
  });
});
