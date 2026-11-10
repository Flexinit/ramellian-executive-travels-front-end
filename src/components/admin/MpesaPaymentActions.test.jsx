// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import MpesaPaymentActions from './MpesaPaymentActions';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

beforeEach(() => {
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});

function renderUi(props = { paymentId: 'p1', status: 'PENDING' }) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <Toaster />
      <MpesaPaymentActions {...props} />
    </QueryClientProvider>
  );
}

describe('fixing an M-Pesa payment by hand', () => {
  it('checks the payment with Safaricom and says what it found', async () => {
    const user = userEvent.setup();
    let synced;
    server.use(http.post(`${BASE}/payments/mpesa/admin/payments/:paymentId/sync`, ({ params }) => {
      synced = params.paymentId;
      return HttpResponse.json({ paymentId: 'p1', status: 'SUCCESSFUL' });
    }));
    renderUi();

    await user.click(screen.getByRole('button', { name: /check with safaricom/i }));
    expect(await screen.findByText(/safaricom says this payment is paid/i)).toBeInTheDocument();
    expect(synced).toBe('p1');
  });

  it('sets a status by hand, with the M-Pesa code for a paid one', async () => {
    const user = userEvent.setup();
    let query;
    server.use(http.patch(`${BASE}/payments/mpesa/admin/payments/p1/status`, ({ request }) => {
      query = new URL(request.url).searchParams;
      return HttpResponse.json({ paymentId: 'p1', status: query.get('status') });
    }));
    renderUi();

    await user.click(screen.getByRole('button', { name: /set status/i }));
    await user.selectOptions(screen.getByLabelText('Status'), 'SUCCESSFUL');
    await user.type(screen.getByLabelText(/m-pesa confirmation code/i), 'sgh7xk2abc');
    await user.click(screen.getByRole('button', { name: /save status/i }));

    expect(await screen.findByText(/payment status updated/i)).toBeInTheDocument();
    expect(query.get('status')).toBe('SUCCESSFUL');
    expect(query.get('receipt')).toBe('SGH7XK2ABC');
    expect(screen.queryByRole('group', { name: /set m-pesa payment status/i })).not.toBeInTheDocument();
  });

  it('sends no receipt for a failed payment, and asks for a status first', async () => {
    const user = userEvent.setup();
    let query;
    server.use(http.patch(`${BASE}/payments/mpesa/admin/payments/p1/status`, ({ request }) => {
      query = new URL(request.url).searchParams;
      return HttpResponse.json({ paymentId: 'p1', status: 'FAILED' });
    }));
    renderUi({ paymentId: 'p1' });

    await user.click(screen.getByRole('button', { name: /set status/i }));
    await user.click(screen.getByRole('button', { name: /save status/i }));
    expect(screen.getByText('Choose a status.')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Status'), 'FAILED');
    expect(screen.queryByLabelText(/m-pesa confirmation code/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /save status/i }));
    expect(await screen.findByText(/payment status updated/i)).toBeInTheDocument();
    expect(query.has('receipt')).toBe(false);
  });
});
