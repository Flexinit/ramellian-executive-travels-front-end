// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import VehicleHandoverModal from './VehicleHandoverModal';

vi.mock('../payment/SignaturePad', () => ({
  default: ({ onChange }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => onChange?.('data:image/png;base64,aGk='), [onChange]);
    return <div data-testid="signature-pad-stub" />;
  },
}));

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderModal(props) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <VehicleHandoverModal isOpen bookingId="bk-1" onClose={() => {}} {...props} />
    </QueryClientProvider>
  );
}

function servePaymentStatus(status) {
  server.use(
    http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () =>
      status ? HttpResponse.json({ status }) : HttpResponse.json({ message: 'Payment not found' }, { status: 404 })
    )
  );
}

describe('VehicleHandoverModal — a car cannot be collected until it has been paid for', () => {
  it('blocks pickup with an explanation when the booking has no successful payment', async () => {
    servePaymentStatus(undefined);
    renderModal({ type: 'pickup' });

    expect(await screen.findByText(/hasn't been paid for yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm pickup/i })).not.toBeInTheDocument();
  });

  it('blocks pickup when the booking has a payment that is still pending, not yet successful', async () => {
    servePaymentStatus('PENDING');
    renderModal({ type: 'pickup' });

    expect(await screen.findByText(/hasn't been paid for yet/i)).toBeInTheDocument();
  });

  it('lets pickup proceed once the booking has a successful payment', async () => {
    servePaymentStatus('SUCCESSFUL');
    renderModal({ type: 'pickup' });

    expect(await screen.findByRole('button', { name: /confirm pickup/i })).toBeInTheDocument();
    expect(screen.queryByText(/hasn't been paid for yet/i)).not.toBeInTheDocument();
  });

  it('never checks payment for a return — the booking already had to be paid to reach ACTIVE', async () => {
    let called = false;
    server.use(
      http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () => {
        called = true;
        return HttpResponse.json({ status: 'SUCCESSFUL' });
      })
    );
    renderModal({ type: 'return' });

    expect(await screen.findByRole('button', { name: /confirm return/i })).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it('submits once paid, and closes the modal on success', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    servePaymentStatus('SUCCESSFUL');
    let pickupRequested = false;
    server.use(
      http.post(`${BASE}/handovers/bookings/:bookingId/pickup`, () => {
        pickupRequested = true;
        return HttpResponse.json({ id: 'ho-1', bookingId: 'bk-1', type: 'PICKUP', bookingStatus: 'ACTIVE' });
      })
    );
    renderModal({ type: 'pickup', onClose });

    await user.type(await screen.findByLabelText(/odometer reading/i), '500');
    await user.selectOptions(screen.getByLabelText(/fuel level/i), 'FULL');
    await user.click(screen.getByRole('button', { name: /confirm pickup/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(pickupRequested).toBe(true);
  });

  it('calls onRecorded, after onClose, once a return is actually saved', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onRecorded = vi.fn();
    server.use(
      http.post(`${BASE}/handovers/bookings/:bookingId/dropoff`, () =>
        HttpResponse.json({ id: 'ho-2', bookingId: 'bk-1', type: 'DROPOFF', bookingStatus: 'COMPLETED' })
      )
    );
    renderModal({ type: 'return', onClose, onRecorded });

    await user.type(await screen.findByLabelText(/odometer reading/i), '900');
    await user.selectOptions(screen.getByLabelText(/fuel level/i), 'FULL');
    await user.click(screen.getByRole('button', { name: /confirm return/i }));

    await waitFor(() => expect(onRecorded).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });
});
