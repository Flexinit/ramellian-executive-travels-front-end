// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { axe } from 'jest-axe';
import toast from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import ContactPage from './ContactPage';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function renderPage(route = '/contact') {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[route]}>
          <ContactPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

// A stand-in location the page's mailto can be caught on. Spreading the real one copies none of its fields (they live
// on its prototype), and the API client needs them to build request addresses — so they're copied by name.
const realLocation = window.location;
beforeEach(() => {
  const { origin, protocol, host, hostname, port, pathname, search, hash } = realLocation;
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { origin, protocol, host, hostname, port, pathname, search, hash, href: `${origin}${pathname}` },
  });
});

describe('ContactPage', () => {
  it('shows the contact details set in Platform Settings — WhatsApp, phone, email, address, social', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: /chat with us on whatsapp/i })).toHaveAttribute('href', 'https://wa.me/254712345678');
    expect(screen.getByRole('link', { name: '+254 712 345 678' })).toHaveAttribute('href', 'tel:+254712345678');
    expect(screen.getByRole('link', { name: 'bookings@ramellianexecutivetravels.co.ke' })).toBeInTheDocument();
    expect(screen.getByText('Westlands, Nairobi')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/ramellian');
  });

  it('shows no placeholder details when none are set — and says the form needs an email first', async () => {
    server.use(http.get(`${import.meta.env.VITE_API_BASE_URL}/api/v1/platform-settings`, () => HttpResponse.json({ id: 's1', commissionRatePct: 1 })));
    renderPage();
    expect(await screen.findByText(/contact email isn.t available just now/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /whatsapp/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/\+254 700 000 000/)).not.toBeInTheDocument();
    expect(screen.getByText('Nairobi, Kenya')).toBeInTheDocument();
  });

  it('pre-selects "Custom Quote Request" when arriving with ?type=quote', () => {
    renderPage('/contact?type=quote');
    expect(screen.getByLabelText(/subject/i)).toHaveValue('quote');
  });

  it('shows validation errors for an empty submission', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText(/enter your full name/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });

  it('submits a valid inquiry via a mailto link', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('link', { name: 'bookings@ramellianexecutivetravels.co.ke' });

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/^email$/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/phone/i), '+254700000001');
    await user.selectOptions(screen.getByLabelText(/subject/i), 'booking');
    await user.type(screen.getByLabelText(/message/i), 'I have a question about my upcoming booking.');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => expect(window.location.href).toContain('mailto:'));
    expect(window.location.href).toContain('mailto:bookings@ramellianexecutivetravels.co.ke');
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/email client should open/i));
  });

  it('has no accessibility violations', async () => {
    const { container } = renderPage();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
