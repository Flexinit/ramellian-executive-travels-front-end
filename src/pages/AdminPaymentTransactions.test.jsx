// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import AdminPaymentTransactionsPage from './AdminPaymentTransactionsPage';
import { transactionStatusVariant } from '../hooks/usePaymentTransactions';
import { useAuthStore } from '../store/authStore';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;
const TX = (over) => ({
  id: 't1', type: 'MPESA_STK', status: 'SUCCESSFUL', amount: 5000, currency: 'KES', phone: '254712345678',
  partyName: 'Jane Renter', providerReference: 'ws_CO_04112026', internalReference: 'RET-1', bookingId: 'b1',
  rawCallback: JSON.stringify({
    Body: {
      stkCallback: {
        MerchantRequestID: '29115-1', CheckoutRequestID: 'ws_CO_04112026', ResultCode: 0, ResultDesc: 'Processed successfully.',
        CallbackMetadata: { Item: [{ Name: 'Amount', Value: 5000 }, { Name: 'MpesaReceiptNumber', Value: 'QK12ABC' }, { Name: 'PhoneNumber', Value: 254712345678 }] },
      },
    },
  }),
  createdAt: '2026-11-04T09:00:00Z', ...over,
});
const page = (content) => ({ content, totalElements: content.length, totalPages: 1, number: 0, first: true, last: true });

function renderUi(ui) {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

beforeEach(() => {
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});

describe('Payment Transactions page (GET /admin/payment-transactions)', () => {
  it('lists the ledger newest first, filters by type, and opens a transaction', async () => {
    const user = userEvent.setup();
    const asked = [];
    server.use(
      http.get(`${BASE}/admin/payment-transactions`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        asked.push(Object.fromEntries(params));
        return HttpResponse.json(
          params.get('type') === 'MPESA_B2C'
            ? page([TX({ id: 't2', type: 'MPESA_B2C', partyName: 'Owner Otieno', amount: 4000 })])
            : page([TX()])
        );
      }),
      http.get(`${BASE}/admin/payment-transactions/t1`, () => HttpResponse.json(TX()))
    );
    renderUi(<AdminPaymentTransactionsPage />);

    expect(await screen.findByText('Jane Renter')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('M-Pesa payment')).toBeInTheDocument();
    // The M-Pesa ref, read from the callback, in its own column.
    expect(within(screen.getByRole('table')).getByText('QK12ABC')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
    expect(asked[0]).toMatchObject({ page: '0', size: '20', sort: 'createdAt,desc' });

    await user.click(screen.getByRole('row', { name: /open m-pesa payment/i }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Successful')).toBeInTheDocument();
    // The M-Pesa ref at the top, then every field M-Pesa sent.
    expect(within(dialog).getAllByText('QK12ABC').length).toBeGreaterThanOrEqual(2);
    const details = within(dialog).getByRole('region', { name: 'M-Pesa details' });
    for (const text of ['Checkout request ID', 'ws_CO_04112026', 'Merchant request ID', '29115-1', 'Result code', 'Processed successfully.']) {
      expect(within(details).getByText(text)).toBeInTheDocument();
    }
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('tab', { name: 'M-Pesa payouts' }));
    expect(await screen.findByText('Owner Otieno')).toBeInTheDocument();
    expect(asked.at(-1)).toMatchObject({ type: 'MPESA_B2C' });
  });

  it('shows whose booking a payment was for when someone else paid it, in the list and the details', async () => {
    const user = userEvent.setup();
    const split = TX({ id: 't9', type: 'MPESA_SPLIT_STK', partyName: 'Ben Friend', phone: '254722000111', renterName: 'Jane Renter', renterPhone: '254712345678' });
    server.use(
      http.get(`${BASE}/admin/payment-transactions`, () => HttpResponse.json(page([split]))),
      http.get(`${BASE}/admin/payment-transactions/t9`, () => HttpResponse.json(split))
    );
    renderUi(<AdminPaymentTransactionsPage />);

    expect(await screen.findByText('for Jane Renter')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^view /i }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Renter')).toBeInTheDocument();
    expect(within(dialog).getByText('Renter phone')).toBeInTheDocument();
  });

  it('each row has a View action that opens that transaction', async () => {
    const user = userEvent.setup();
    let fetched = null;
    server.use(
      http.get(`${BASE}/admin/payment-transactions`, () => HttpResponse.json(page([TX()]))),
      http.get(`${BASE}/admin/payment-transactions/:id`, ({ params }) => {
        fetched = params.id;
        return HttpResponse.json(TX());
      })
    );
    renderUi(<AdminPaymentTransactionsPage />);

    await user.click(await screen.findByRole('button', { name: /view m-pesa payment of kes 5,000/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(fetched).toBe('t1');
  });

  it('pages with the shared controls, and Per page asks the backend for that many', async () => {
    const user = userEvent.setup();
    const asked = [];
    server.use(
      http.get(`${BASE}/admin/payment-transactions`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        const n = Number(params.get('page'));
        const size = Number(params.get('size'));
        asked.push({ n, size });
        return HttpResponse.json({ ...page([TX({ id: `t-${n}` })]), totalElements: 45, totalPages: Math.ceil(45 / size), number: n });
      })
    );
    renderUi(<AdminPaymentTransactionsPage />);

    const pager = await screen.findByRole('navigation', { name: 'Pagination' });
    expect(within(pager).getByText(/showing/i)).toHaveTextContent('Showing 1–20 of 45 transactions');
    await user.click(within(pager).getByRole('button', { name: 'Go to page 3' }));
    await waitFor(() => expect(asked).toContainEqual({ n: 2, size: 20 }));
    await user.selectOptions(within(screen.getByRole('navigation', { name: 'Pagination' })).getByLabelText('Per page'), '100');
    await waitFor(() => expect(asked).toContainEqual({ n: 0, size: 100 }));
  });

  it('sends the picked days as the start and end of those days', async () => {
    const user = userEvent.setup();
    const asked = [];
    server.use(
      http.get(`${BASE}/admin/payment-transactions`, ({ request }) => {
        asked.push(Object.fromEntries(new URL(request.url).searchParams));
        return HttpResponse.json(page([]));
      })
    );
    renderUi(<AdminPaymentTransactionsPage />);
    expect(await screen.findByText('No transactions found')).toBeInTheDocument();

    await user.type(screen.getByLabelText('From'), '2026-11-01');
    await user.type(screen.getByLabelText('To'), '2026-11-04');
    await waitFor(() => expect(asked.at(-1)).toMatchObject({
      from: new Date('2026-11-01T00:00:00').toISOString(),
      to: new Date('2026-11-04T23:59:59.999').toISOString(),
    }));
  });

  it.each([404, 403])('on a backend without the ledger or refusing it (%i), shows no error and drops the page from the menu', async (status) => {
    useAuthStore.setState({ deniedPaths: [] });
    server.use(http.get(`${BASE}/admin/payment-transactions`, () => new HttpResponse(null, { status })));
    renderUi(<AdminPaymentTransactionsPage />);
    await waitFor(() => expect(useAuthStore.getState().deniedPaths).toContain('/admin/payment-transactions'));
    expect(screen.queryByText(/couldn't load/i)).not.toBeInTheDocument();
  });

  it('colours a status by what it means', () => {
    expect(transactionStatusVariant('SUCCESSFUL')).toBe('success');
    expect(transactionStatusVariant('COMPLETED')).toBe('success');
    expect(transactionStatusVariant('FAILED')).toBe('danger');
    expect(transactionStatusVariant('PENDING')).toBe('warning');
    expect(transactionStatusVariant(null)).toBe('neutral');
  });
});
