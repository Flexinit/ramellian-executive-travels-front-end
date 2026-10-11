// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { axe } from 'jest-axe';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import OwnerDashboardPage from './OwnerDashboardPage';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <OwnerDashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

function mockCurrentUser(overrides = {}) {
  server.use(
    http.get(`${BASE}/users/me`, () =>
      HttpResponse.json({
        id: '1',
        email: 'owner@example.com',
        firstName: 'Olu',
        lastName: 'Owner',
        phoneNumber: '0712345678',
        location: 'Nairobi',
        roles: ['OWNER'],
        ...overrides,
      })
    )
  );
}

function mockVehicles(vehicles = []) {
  server.use(http.get(`${BASE}/vehicles/me`, () => HttpResponse.json(vehicles)));
}

/** Documents as the live backend sends them: `documentType` / `reviewStatus`. */
function mockDocuments(documents = []) {
  server.use(
    http.get(`${BASE}/documents/me`, () =>
      HttpResponse.json(documents.map(({ type, status, ...rest }) => ({ ...rest, documentType: type, reviewStatus: status })))
    )
  );
}

beforeEach(() => {
  act(() => useAuthStore.setState({ token: 'test-token', user: { id: '1', email: 'owner@example.com', roles: ['OWNER'] } }));
});

afterEach(() => {
  act(() => useAuthStore.getState().clearAuth());
});

describe('OwnerDashboardPage', () => {
  it('shows step 1 (profile form) when the owner profile is incomplete', async () => {
    mockCurrentUser({ ownerType: undefined });
    mockVehicles([]);
    renderPage();

    expect(await screen.findByRole('heading', { name: /let's get your fleet set up/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /complete your profile/i })).toBeInTheDocument();
    expect(await screen.findByRole('radio', { name: /individual/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /business/i })).toBeInTheDocument();
  });

  it('reveals business fields only when "Business" is selected', async () => {
    const user = userEvent.setup();
    mockCurrentUser({ ownerType: undefined });
    mockVehicles([]);
    renderPage();

    await screen.findByRole('radio', { name: /business/i });
    expect(screen.queryByLabelText(/business name/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /business/i }));
    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/registration number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tax number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business address/i)).toBeInTheDocument();
  });

  it('shows step 2 (verify identity CTA) once the profile is complete but no identity document is uploaded', async () => {
    mockCurrentUser({ ownerType: 'INDIVIDUAL' });
    mockVehicles([]);
    mockDocuments([]);
    renderPage();

    expect(await screen.findByRole('heading', { name: /profile complete/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /verify your identity/i })).toHaveAttribute('href', '/dashboard/documents');
  });

  it('treats a rejected identity document as still incomplete', async () => {
    mockCurrentUser({ ownerType: 'INDIVIDUAL' });
    mockVehicles([]);
    mockDocuments([{ id: 'd1', type: 'NATIONAL_ID', status: 'REJECTED' }]);
    renderPage();

    expect(await screen.findByRole('heading', { name: /profile complete/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /verify your identity/i })).toBeInTheDocument();
  });

  it('shows step 3 (add vehicle CTA) once profile and identity are complete but no vehicle exists yet', async () => {
    mockCurrentUser({ ownerType: 'INDIVIDUAL' });
    mockVehicles([]);
    mockDocuments([{ id: 'd1', type: 'NATIONAL_ID', status: 'APPROVED' }]);
    renderPage();

    expect(await screen.findByRole('heading', { name: /identity verified/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /add your first vehicle/i })).toHaveAttribute('href', '/owner/vehicles/new');
  });

  it('shows the fleet overview once the profile is complete, identity is verified, and a vehicle exists', async () => {
    mockCurrentUser({ ownerType: 'INDIVIDUAL' });
    mockVehicles([{ id: 'v1', model: 'Toyota Prado', ownerEmail: 'owner@example.com' }]);
    mockDocuments([{ id: 'd1', type: 'NATIONAL_ID', status: 'APPROVED' }]);
    renderPage();

    expect(await screen.findByRole('heading', { name: /welcome, olu/i })).toBeInTheDocument();
    expect(screen.getByText('Car Owner')).toBeInTheDocument();
    expect(screen.getByText('Vehicles Listed')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /add another vehicle/i })).toHaveAttribute('href', '/owner/vehicles/new');
    expect(screen.getByRole('link', { name: /fleet bookings/i })).toHaveAttribute('href', '/owner/bookings');
  });

  it('lists the owner\'s vehicles on the fleet overview with a link to the full list', async () => {
    mockCurrentUser({ ownerType: 'INDIVIDUAL' });
    mockVehicles([{ id: 'v1', model: 'Toyota Prado', ownerEmail: 'owner@example.com' }]);
    mockDocuments([{ id: 'd1', type: 'NATIONAL_ID', status: 'APPROVED' }]);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Toyota Prado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view all/i })).toHaveAttribute('href', '/owner/vehicles');
  });

  it('trusts the backend hasAddedVehicleToProfile flag even when the public vehicle list is empty', async () => {
    mockCurrentUser({ ownerType: 'INDIVIDUAL', hasAddedVehicleToProfile: true });
    mockVehicles([]);
    mockDocuments([{ id: 'd1', type: 'NATIONAL_ID', status: 'APPROVED' }]);
    renderPage();

    expect(await screen.findByRole('heading', { name: /welcome, olu/i })).toBeInTheDocument();
  });

  it('does not hold a Business owner back for business certificates — an identity document is enough', async () => {
    mockCurrentUser({ ownerType: 'BUSINESS' });
    mockVehicles([]);
    mockDocuments([{ id: 'd1', type: 'NATIONAL_ID', status: 'APPROVED' }]);
    renderPage();

    expect(await screen.findByRole('heading', { name: /identity verified/i })).toBeInTheDocument();
  });

  it('still moves a Business owner on when they have uploaded their business documents too', async () => {
    mockCurrentUser({ ownerType: 'BUSINESS' });
    mockVehicles([]);
    mockDocuments([
      { id: 'd1', type: 'PASSPORT', status: 'PENDING' },
      { id: 'd2', type: 'BUSINESS_REGISTRATION', status: 'PENDING' },
      { id: 'd3', type: 'TAX_CERTIFICATE', status: 'APPROVED' },
    ]);
    renderPage();

    expect(await screen.findByRole('heading', { name: /identity verified/i })).toBeInTheDocument();
  });

  it('shows the add-your-first-vehicle step when the backend says the owner has no vehicles (GET /vehicles/me is empty)', async () => {
    mockCurrentUser({ ownerType: 'INDIVIDUAL' });
    mockVehicles([]);
    mockDocuments([{ id: 'd1', type: 'NATIONAL_ID', status: 'APPROVED' }]);
    renderPage();

    expect(await screen.findByRole('heading', { name: /identity verified/i })).toBeInTheDocument();
  });

  it('shows a retryable error banner when the documents or vehicles fetch fails, instead of silently looking incomplete', async () => {
    mockCurrentUser({ ownerType: 'INDIVIDUAL' });
    server.use(
      http.get(`${BASE}/documents/me`, () => HttpResponse.json({ message: 'boom' }, { status: 500 })),
      http.get(`${BASE}/vehicles/me`, () => HttpResponse.json({ message: 'boom' }, { status: 500 }))
    );
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't check your identity document or vehicle status/i);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('submitting the profile form saves it and advances to step 2', async () => {
    const user = userEvent.setup();
    mockCurrentUser({ ownerType: undefined });
    mockVehicles([]);
    renderPage();

    await screen.findByRole('radio', { name: /individual/i });
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    await waitFor(() => expect(useAuthStore.getState().user.ownerType).toBe('INDIVIDUAL'));
  });

  it('has no accessibility violations in the profile step', async () => {
    mockCurrentUser({ ownerType: undefined });
    mockVehicles([]);
    const { container } = renderPage();
    await screen.findByRole('radio', { name: /individual/i });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
