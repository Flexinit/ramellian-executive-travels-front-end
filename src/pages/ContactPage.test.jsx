// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { axe } from 'jest-axe';
import toast from 'react-hot-toast';
import ContactPage from './ContactPage';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function renderPage(route = '/contact') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[route]}>
        <ContactPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, href: '' },
  });
});

describe('ContactPage', () => {
  it('renders a WhatsApp link and phone numbers', () => {
    renderPage();
    const whatsappLink = screen.getByRole('link', { name: /chat with us on whatsapp/i });
    expect(whatsappLink).toHaveAttribute('href', expect.stringContaining('wa.me'));
    expect(screen.getByRole('link', { name: '+254 700 000 000' })).toHaveAttribute('href', 'tel:+254700000000');
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

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/^email$/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/phone/i), '+254700000001');
    await user.selectOptions(screen.getByLabelText(/subject/i), 'booking');
    await user.type(screen.getByLabelText(/message/i), 'I have a question about my upcoming booking.');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => expect(window.location.href).toContain('mailto:'));
    expect(window.location.href).toContain('mailto:bookings@ramellianexecutivetravels.com');
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/email client should open/i));
  });

  it('has no accessibility violations', async () => {
    const { container } = renderPage();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
