// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import Footer from './Footer';

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );
}

describe('Footer — compact (Browse Vehicles)', () => {
  it('keeps only the copyright and the legal links, no company columns', () => {
    render(
      <MemoryRouter>
        <Footer compact />
      </MemoryRouter>
    );
    expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'About Us' })).not.toBeInTheDocument();
  });
});

describe('Footer', () => {
  it('renders 3 link columns', () => {
    renderFooter();
    expect(screen.getByRole('navigation', { name: 'Services' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Vehicles' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Company' })).toBeInTheDocument();
  });

  it('renders the location and a link to the contact page', () => {
    renderFooter();
    expect(screen.getByText(/Nairobi, Kenya/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact Us' })).toHaveAttribute('href', '/contact');
  });

  it('renders the copyright notice with the current year', () => {
    renderFooter();
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${year} Ramellian Executive Travels`))).toBeInTheDocument();
  });

  it('renders the brand logo', () => {
    renderFooter();
    expect(screen.getByText('RAMELLIAN')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderFooter();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
