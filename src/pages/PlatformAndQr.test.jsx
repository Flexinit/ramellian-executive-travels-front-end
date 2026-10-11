// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { axe } from 'jest-axe';
import { server } from '../mocks/server';
import { emptyReport } from '../mocks/handlers';
import { useAuthStore } from '../store/authStore';
import AdminVehiclesPage from './AdminVehiclesPage';
import AdminReportsPage from './AdminReportsPage';
import { scanSticker } from '../lib/qrScan';

// Decoding a photo needs a real canvas, which the test browser doesn't have — so the reading is stubbed and
// everything around it (what the panel shows for each answer) is real.
vi.mock('../lib/qrScan', async (importOriginal) => ({ ...(await importOriginal()), scanSticker: vi.fn() }));

const BASE = 'http://192.168.8.11:8080/api/v1';
const pixel = 'data:image/png;base64,iVBORw0KGgo=';

function renderUi(element) {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MemoryRouter>{element}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

beforeEach(() => {
  scanSticker.mockReset();
  act(() => useAuthStore.setState({ token: 't', user: { id: 'me-1', email: 'felix@example.com', roles: ['ADMIN'] } }));
});

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null, mode: null }));
});

describe('insurance sticker QR check', () => {
  const CAR = { id: 'v-1', model: 'Toyota Prado', registrationNumber: 'KDA 123A', location: 'Nairobi', pricePerDay: 9000, available: true, ownerEmail: 'o@example.com', comprehensiveInsurance: true, insuranceVerificationStickerPhoto: pixel };

  async function openSticker(answer) {
    scanSticker.mockResolvedValue(answer);
    server.use(http.get(`${BASE}/vehicles/admin/all`, () => HttpResponse.json([CAR])));
    const user = userEvent.setup();
    renderUi(<AdminVehiclesPage />);
    await user.click(await screen.findByRole('button', { name: 'View insurance sticker: Toyota Prado' }));
    return within(await screen.findByRole('dialog'));
  }

  it('reads the QR code from the sticker photo by itself when it opens', async () => {
    const dialog = await openSticker('https://dmvic.com/verify?c=99');
    expect(await dialog.findByText('QR code found')).toBeInTheDocument();
    expect(scanSticker).toHaveBeenCalledWith(pixel);
    expect(dialog.getByLabelText('What the QR code says')).toHaveTextContent('https://dmvic.com/verify?c=99');
  });

  it('offers a link when the QR is a web address', async () => {
    const dialog = await openSticker('https://dmvic.com/verify?c=99');
    const link = await dialog.findByRole('link', { name: /open the qr link/i });
    expect(link).toHaveAttribute('href', 'https://dmvic.com/verify?c=99');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('offers no link for a QR that is only text, and never for a non-web address', async () => {
    const dialog = await openSticker('javascript:alert(1)');
    await dialog.findByText('QR code found');
    expect(dialog.queryByRole('link', { name: /open the qr link/i })).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('says whether the vehicle registration appears in the QR text', async () => {
    const yes = await openSticker('cert=1;reg=KDA123A');
    expect(await yes.findByText('Registration appears in the QR')).toBeInTheDocument();
  });

  it('says so when the registration is not in the QR text (which is not the same as wrong)', async () => {
    const dialog = await openSticker('CERT-0012345');
    expect(await dialog.findByText('Registration not in the QR text')).toBeInTheDocument();
  });

  it('warns when no QR code could be read', async () => {
    const dialog = await openSticker(null);
    expect(await dialog.findByText('No QR code found')).toBeInTheDocument();
    expect(dialog.getByText(/ask the owner for a clearer photo/i)).toBeInTheDocument();
    expect(dialog.queryByText('QR code found')).not.toBeInTheDocument();
  });

  it('is clear that the QR only shows a sticker has one — validity is the AKI verifier’s answer', async () => {
    const dialog = await openSticker('https://dmvic.com/verify?c=99');
    await dialog.findByText('QR code found');
    expect(dialog.getByText(/decided by the association of kenya/i)).toBeInTheDocument();
    expect(dialog.getByText('*352#')).toBeInTheDocument();
    expect(dialog.getAllByText('KDA 123A').length).toBeGreaterThan(0);
  });

  it('still shows the sticker photo itself', async () => {
    const dialog = await openSticker(null);
    expect(dialog.getByRole('img', { name: 'Insurance sticker for Toyota Prado' })).toHaveAttribute('src', pixel);
  });
});

describe('platform report', () => {
  const minutesAgo = (n) => new Date(Date.now() - n * 60 * 1000).toISOString();
  const login = (id, email, minutes, extra = {}) => ({ id, actorEmail: email, action: 'AUTH_LOGIN', status: 'SUCCESS', resourceType: 'USER', createdAt: minutesAgo(minutes), ...extra });

  beforeEach(() => {
    server.use(
      http.get(`${BASE}/users/admin`, () =>
        HttpResponse.json([
          { id: '1', enabled: true, roles: ['SUPER_ADMIN', 'CAR_OWNER'], emailVerified: true, twoFactorEnabled: true, hasCompletedProfile: true },
          { id: '2', enabled: true, roles: [], emailVerified: true },
          { id: '3', enabled: false, roles: ['CAR_OWNER'] },
        ])
      ),
      http.get(`${BASE}/vehicles/admin/all`, () =>
        HttpResponse.json([
          { id: 'v1', location: 'Nairobi', pricePerDay: 10000, available: true, comprehensiveInsurance: true, insuranceVerificationStickerPhoto: '/s.png', selfDrive: true },
          { id: 'v2', location: 'Nairobi', pricePerDay: 20000, available: false, comprehensiveInsurance: false, chauffeured: true },
        ])
      ),
      http.get(`${BASE}/documents/admin/pending`, () => HttpResponse.json([{ id: 'd1' }, { id: 'd2' }])),
      http.get(`${BASE}/bookings/reports/admin`, () => HttpResponse.json({ ...emptyReport, totalBookings: 4 })),
      http.get(`${BASE}/admin/audit-logs`, () =>
        HttpResponse.json({
          content: [login('l1', 'ann@example.com', 5), login('l2', 'ben@example.com', 20), login('l3', 'ann@example.com', 30), login('l4', 'old@example.com', 300)],
          empty: false, first: true, last: true, number: 0, size: 200, totalElements: 4, totalPages: 1, numberOfElements: 4,
        })
      )
    );
  });

  it('shows who has signed in within the last hour, and says what that number is (the default Activity tab)', async () => {
    renderUi(<AdminReportsPage />);
    const list = await screen.findByRole('list', { name: 'People signed in recently' });
    expect(within(list).getByText('ann@example.com')).toBeInTheDocument();
    expect(within(list).getByText('ben@example.com')).toBeInTheDocument();
    expect(within(list).queryByText('old@example.com')).not.toBeInTheDocument();
    const section = screen.getByRole('region', { name: 'Signed in recently' });
    expect(within(section).getByText('Signed in, last 60 minutes').parentElement).toHaveTextContent('2');
    expect(within(section).getByText('3 in the last 24 hours')).toBeInTheDocument();
    expect(within(section).getByText(/not a count of open browsers/i)).toBeInTheDocument();
  });

  it('counts people: accounts, active, disabled and each role, on the People tab', async () => {
    const user = userEvent.setup();
    renderUi(<AdminReportsPage />);
    await user.click(screen.getByRole('tab', { name: 'People' }));
    const section = await screen.findByRole('region', { name: 'People' });
    const value = async (label) => (await within(section).findByText(label)).parentElement;
    expect(await value('Accounts')).toHaveTextContent('3');
    expect(await value('Active')).toHaveTextContent('2');
    expect(await value('Disabled')).toHaveTextContent('1');
    expect(await value('Car owners')).toHaveTextContent('2');
    expect(await value('Renters')).toHaveTextContent('1');
    expect(await value('Admins')).toHaveTextContent('1');
    expect(within(section).getByText('1 with two-factor on')).toBeInTheDocument();
  });

  it('counts vehicles: available, insured, kinds, average price and places, on the Vehicles tab', async () => {
    const user = userEvent.setup();
    renderUi(<AdminReportsPage />);
    await user.click(screen.getByRole('tab', { name: 'Vehicles' }));
    const section = await screen.findByRole('region', { name: 'Vehicles' });
    const value = async (label) => (await within(section).findByText(label, { selector: 'p' })).parentElement;
    expect(await value('Vehicles')).toHaveTextContent('2');
    expect(await value('Available to book')).toHaveTextContent('1');
    expect(within(section).getByText('1 switched off')).toBeInTheDocument();
    expect(await value('Insured')).toHaveTextContent('1');
    expect(within(section).getByText('1 with a sticker photo')).toBeInTheDocument();
    expect(await value('Documents to review')).toHaveTextContent('2');
    expect(within(section).getByRole('list', { name: 'Vehicles by place' })).toHaveTextContent('Nairobi 2');
  });

  it('keeps the revenue report on its own tab', async () => {
    const user = userEvent.setup();
    renderUi(<AdminReportsPage />);
    await user.click(screen.getByRole('tab', { name: 'Revenue' }));
    expect(await screen.findByRole('heading', { name: 'Bookings and revenue' })).toBeInTheDocument();
    expect((await screen.findByText('Total Bookings', { selector: 'p' })).parentElement).toHaveTextContent('4');
  });

  it("one tab's section failing doesn't block another tab from loading fine", async () => {
    server.use(http.get(`${BASE}/users/admin`, () => new HttpResponse(null, { status: 403 })));
    const user = userEvent.setup();
    renderUi(<AdminReportsPage />);
    // The default Activity tab is unaffected by the People tab's own failure.
    expect(await screen.findByRole('list', { name: 'People signed in recently' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'People' }));
    expect(await screen.findByText(/couldn't load the accounts/i)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Vehicles' }));
    expect(await screen.findByRole('region', { name: 'Vehicles' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderUi(<AdminReportsPage />);
    await screen.findByRole('list', { name: 'People signed in recently' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
