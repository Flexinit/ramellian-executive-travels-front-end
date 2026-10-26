// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import OwnerPayoutsCard from './OwnerPayoutsCard';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderCard() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <OwnerPayoutsCard />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('OwnerPayoutsCard', () => {
  it("lists the owner's payouts with where each stands, and what's still on its way (GET /owner/disbursements)", async () => {
    server.use(http.get(`${BASE}/owner/disbursements`, () => HttpResponse.json([
      { id: 'd1', bookingId: 'b1', vehicleTitle: 'Toyota Prado', amount: 9000, status: 'COMPLETED', reference: 'QWE123', triggeredAt: '2026-10-20T10:00:00Z', createdAt: '2026-10-19T10:00:00Z' },
      { id: 'd2', bookingId: 'b2', vehicleTitle: 'VW Touran', amount: 4500, status: 'PROCESSING', triggeredAt: '2026-10-26T10:00:00Z', createdAt: '2026-10-26T09:00:00Z' },
    ])));
    renderCard();

    expect(await screen.findByText('Toyota Prado')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('On its way')).toBeInTheDocument();
    expect(screen.getByText(/ref QWE123/)).toBeInTheDocument();
    expect(screen.getByText(/on its way:/i).textContent).toMatch(/4,500/);
  });

  it('says so quietly when payouts can’t be read, without breaking the page', async () => {
    server.use(http.get(`${BASE}/owner/disbursements`, () => HttpResponse.json({ message: 'nope' }, { status: 403 })));
    renderCard();
    expect(await screen.findByText(/can.t be shown right now/i)).toBeInTheDocument();
  });
});
