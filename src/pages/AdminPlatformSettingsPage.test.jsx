// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import AdminPlatformSettingsPage from './AdminPlatformSettingsPage';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderUi() {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <Toaster />
        <MemoryRouter initialEntries={['/admin/settings']}>
          <AdminPlatformSettingsPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

beforeEach(() => {
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});

describe('AdminPlatformSettingsPage', () => {
  it('shows the current commission rate', async () => {
    server.use(http.get(`${BASE}/platform-settings`, () => HttpResponse.json({ id: 's1', commissionRatePct: 1 })));
    renderUi();

    expect(await screen.findByLabelText('Commission rate (%)')).toHaveValue(1);
  });

  it('saves a new rate with PUT /platform-settings', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/platform-settings`, () => HttpResponse.json({ id: 's1', commissionRatePct: 1 })));
    let body;
    server.use(
      http.put(`${BASE}/platform-settings`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 's1', commissionRatePct: body.commissionRatePct });
      })
    );
    renderUi();

    const input = await screen.findByLabelText('Commission rate (%)');
    await user.clear(input);
    await user.type(input, '2.5');
    await user.click(screen.getByRole('button', { name: /save/i }));

    // All three are sent together — the PUT replaces the settings as a whole.
    await waitFor(() => expect(body).toEqual({ commissionRatePct: 2.5, pesapalTransactionFeeRatePct: 0, deliveryFlatFee: 0, driverFlatCharge: 0 }));
  });

  it("rejects a rate outside 0-100 without calling the backend", async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/platform-settings`, () => HttpResponse.json({ id: 's1', commissionRatePct: 1 })));
    let called = false;
    server.use(http.put(`${BASE}/platform-settings`, () => { called = true; return HttpResponse.json({}); }));
    renderUi();

    const input = await screen.findByLabelText('Commission rate (%)');
    await user.clear(input);
    await user.type(input, '150');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/between 0 and 100/i)).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it("shows the backend's reason when the rate is refused", async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/platform-settings`, () => HttpResponse.json({ id: 's1', commissionRatePct: 1 })));
    server.use(http.put(`${BASE}/platform-settings`, () => HttpResponse.json({ message: 'Only an administrator can change this.' }, { status: 403 })));
    renderUi();

    const input = await screen.findByLabelText('Commission rate (%)');
    await user.clear(input);
    await user.type(input, '5');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/only an administrator can change this/i)).toBeInTheDocument();
  });

  it('shows a retryable error banner when the rate fails to load', async () => {
    server.use(http.get(`${BASE}/platform-settings`, () => HttpResponse.json({ message: 'nope' }, { status: 500 })));
    renderUi();

    expect(await screen.findByText(/could not load the platform settings/i)).toBeInTheDocument();
  });

  it("sets the flat delivery fee, keeping the other settings as they were", async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/platform-settings`, () =>
      HttpResponse.json({ id: "s1", commissionRatePct: 2, pesapalTransactionFeeRatePct: 3.5, deliveryFlatFee: 0, driverFlatCharge: 2000, botAssistantEnabled: false })));
    let body;
    server.use(http.put(`${BASE}/platform-settings`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json({ id: "s1", ...body });
    }));
    renderUi();

    const fee = await screen.findByLabelText("Delivery flat fee (KES)");
    await user.clear(fee);
    await user.type(fee, "1500");
    await user.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => expect(body).toEqual({
      commissionRatePct: 2,
      pesapalTransactionFeeRatePct: 3.5,
      deliveryFlatFee: 1500,
      driverFlatCharge: 2000,
      botAssistantEnabled: false,
    }));
  });

  it('sets the driver flat charge', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/platform-settings`, () => HttpResponse.json({ id: 's1', commissionRatePct: 2 })));
    let body;
    server.use(http.put(`${BASE}/platform-settings`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json({ id: 's1', ...body });
    }));
    renderUi();

    const charge = await screen.findByLabelText('Driver flat charge (KES)');
    await user.clear(charge);
    await user.type(charge, '2500');
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => expect(body).toMatchObject({ commissionRatePct: 2, driverFlatCharge: 2500 }));
  });

  it('turns the assistant off with PUT /platform-settings/bot', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/platform-settings`, () => HttpResponse.json({ id: 's1', commissionRatePct: 2, botAssistantEnabled: true })));
    let body;
    server.use(http.put(`${BASE}/platform-settings/bot`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json({ id: 's1', commissionRatePct: 2, botAssistantEnabled: body.enabled });
    }));
    renderUi();

    await user.click(await screen.findByRole('button', { name: 'Turn the assistant off' }));

    await waitFor(() => expect(body).toEqual({ enabled: false }));
    expect(await screen.findByRole('button', { name: 'Turn the assistant on' })).toBeInTheDocument();
  });
});
