// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import App from '../App';
import AdminQuotationPage from './AdminQuotationPage';
import { useAuthStore } from '../store/authStore';

function renderAt(ui, route) {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <Toaster />
        <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          {ui}
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

function signInWith(roles) {
  act(() => {
    useAuthStore.setState({ token: 'test-token', user: { id: '1', firstName: 'Sam', lastName: 'Admin', email: 'sam@example.com' } });
    useAuthStore.getState().setUser({ roles });
  });
}

beforeEach(() => {
  localStorage.clear();
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null, mode: null }));
});

describe('AdminQuotationPage', () => {
  it('works out each line and the total, with VAT, as you type', async () => {
    const user = userEvent.setup();
    signInWith(['SUPER_ADMIN']);
    renderAt(<AdminQuotationPage />, '/admin/quotations');

    await user.type(screen.getByLabelText(/Item 1/), 'Airport transfer');
    await user.clear(screen.getByLabelText('Quantity'));
    await user.type(screen.getByLabelText('Quantity'), '3');
    await user.type(screen.getByLabelText(/Rate \(KES\)/), '15000');

    expect(screen.getByTestId('item-amount-0')).toHaveTextContent('KES 45,000.00');
    // 45,000 + 16% VAT
    const preview = screen.getByRole('article', { name: 'Quotation preview' });
    expect(within(preview).getByText('KES 52,200.00')).toBeInTheDocument();
    expect(within(preview).getByText('Airport transfer')).toBeInTheDocument();
  });

  it('adds and removes items', async () => {
    const user = userEvent.setup();
    signInWith(['SUPER_ADMIN']);
    renderAt(<AdminQuotationPage />, '/admin/quotations');

    await user.click(screen.getByRole('button', { name: /Add item/ }));
    expect(screen.getByLabelText(/Item 2/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove item 2' }));
    expect(screen.queryByLabelText(/Item 2/)).not.toBeInTheDocument();
  });

  it("won't print until the quotation is filled in, then prints just the quotation", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    signInWith(['SUPER_ADMIN']);
    renderAt(<AdminQuotationPage />, '/admin/quotations');

    await user.click(screen.getByRole('button', { name: /Print \/ Save as PDF/ }));
    expect(print).not.toHaveBeenCalled();
    expect(screen.getByText('Enter who the quotation is for')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Name or company/), 'Acme Ltd');
    await user.type(screen.getByLabelText(/Item 1/), 'Wedding convoy');
    await user.type(screen.getByLabelText(/Rate \(KES\)/), '30000');
    await user.click(screen.getByRole('button', { name: /Print \/ Save as PDF/ }));
    expect(print).toHaveBeenCalledTimes(1);
    expect(document.body.classList.contains('printing-invoice')).toBe(true);
    print.mockRestore();
    window.dispatchEvent(new Event('afterprint'));
  });

  it('keeps the quotation being worked on after a reload', async () => {
    const user = userEvent.setup();
    signInWith(['SUPER_ADMIN']);
    const { unmount } = renderAt(<AdminQuotationPage />, '/admin/quotations');
    await user.type(screen.getByLabelText(/Name or company/), 'Acme Ltd');
    unmount();

    renderAt(<AdminQuotationPage />, '/admin/quotations');
    expect(screen.getByLabelText(/Name or company/)).toHaveValue('Acme Ltd');
  });
});

describe('who can make quotations', () => {
  it('is in the Admin Panel menu for a super admin, and the quotation says so', async () => {
    signInWith(['SUPER_ADMIN']);
    renderAt(<App />, '/admin/quotations');
    expect(await screen.findByRole('heading', { level: 1, name: 'Quotations' })).toBeInTheDocument();
    const menu = screen.getByRole('navigation', { name: 'Dashboard' });
    expect(within(menu).getByRole('link', { name: /Quotations/ })).toHaveAttribute('href', '/admin/quotations');
    const preview = screen.getByRole('article', { name: 'Quotation preview' });
    expect(within(preview).getByText('Valid until')).toBeInTheDocument();
    expect(within(preview).getByText(/^QUO-/)).toBeInTheDocument();
  });

  it('is not for an administrator who is not a super admin', async () => {
    signInWith(['ADMIN']);
    renderAt(<App />, '/admin/quotations');
    await screen.findByRole('navigation', { name: 'Dashboard' });
    expect(screen.queryByRole('heading', { level: 1, name: 'Quotations' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Dashboard' })).queryByRole('link', { name: /Quotations/ })).not.toBeInTheDocument();
  });

  it.each([['a renter', ['CAR_RENTER']], ['a car owner', ['CAR_OWNER']]])('is closed to %s', async (_, roles) => {
    signInWith(roles);
    renderAt(<App />, '/admin/quotations');
    await screen.findByRole('navigation', { name: 'Dashboard' });
    expect(screen.queryByRole('heading', { level: 1, name: 'Quotations' })).not.toBeInTheDocument();
  });
});
