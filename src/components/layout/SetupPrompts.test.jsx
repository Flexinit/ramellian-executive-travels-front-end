// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { axe } from 'jest-axe';
import { server } from '../../mocks/server';
import { useAuthStore } from '../../store/authStore';
import SetupPrompts from './SetupPrompts';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderAt(route = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <SetupPrompts />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function signIn(user) {
  // Mandatory details are filled by default; individual tests override them.
  act(() =>
    useAuthStore.setState({
      token: 'test-token',
      user: {
        id: '1',
        email: 'a@example.com',
        roles: ['RENTER'],
        firstName: 'Ann',
        lastName: 'Lee',
        phoneNumber: '0712345678',
        location: 'Nairobi',
        ...user,
      },
    })
  );
}

function mockDocuments(docs = []) {
  server.use(http.get(`${BASE}/documents/me`, () => HttpResponse.json(docs)));
}

const ID_APPROVED = { id: 'd1', documentType: 'NATIONAL_ID', reviewStatus: 'APPROVED' };

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null }));
});

describe('SetupPrompts', () => {
  it('renders nothing for a signed-out visitor', () => {
    const { container } = renderAt();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while the completion flags are still unknown (GET /users/me not resolved yet)', () => {
    signIn({ roles: ['OWNER'] });
    const { container } = renderAt();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when profile, documents and vehicle are all done', async () => {
    mockDocuments([ID_APPROVED]);
    signIn({ roles: ['OWNER'], ownerType: 'INDIVIDUAL', hasCompletedProfile: true, hasAddedVehicleToProfile: true });
    const { container } = renderAt();
    await new Promise((r) => setTimeout(r, 50));
    expect(container).toBeEmptyDOMElement();
  });

  it('prompts a car owner to complete the profile when hasCompletedProfile is false', () => {
    signIn({ roles: ['OWNER'], hasCompletedProfile: false });
    renderAt();
    expect(screen.getByText(/profile isn't complete yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /complete profile/i })).toHaveAttribute('href', '/dashboard/profile');
  });

  it('does not prompt a renter to add a vehicle', async () => {
    mockDocuments([ID_APPROVED]);
    signIn({ ownerType: 'INDIVIDUAL', hasCompletedProfile: true, hasAddedVehicleToProfile: false });
    const { container } = renderAt();
    await new Promise((r) => setTimeout(r, 50));
    expect(container).toBeEmptyDOMElement();
  });

  it('prompts a car owner to add a vehicle', async () => {
    mockDocuments([ID_APPROVED]);
    signIn({ roles: ['OWNER'], ownerType: 'INDIVIDUAL', hasCompletedProfile: true, hasAddedVehicleToProfile: false });
    renderAt();
    expect(await screen.findByRole('link', { name: /add a vehicle/i })).toHaveAttribute('href', '/owner/vehicles/new');
  });

  it('treats isCarOwner as a car owner even without the OWNER role', async () => {
    mockDocuments([ID_APPROVED]);
    signIn({ roles: ['RENTER'], isCarOwner: true, ownerType: 'INDIVIDUAL', hasCompletedProfile: true, hasAddedVehicleToProfile: false });
    renderAt();
    expect(await screen.findByRole('link', { name: /add a vehicle/i })).toBeInTheDocument();
  });

  it('prompts for the missing identity document once the profile is complete', async () => {
    mockDocuments([]);
    signIn({ ownerType: 'INDIVIDUAL', hasCompletedProfile: true });
    renderAt();
    expect(await screen.findByText(/documents still needed: identity document/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /upload documents/i })).toHaveAttribute('href', '/dashboard/documents');
  });

  it('does not nag a Business account for certificates — only the identity document is required', async () => {
    mockDocuments([ID_APPROVED]);
    signIn({ ownerType: 'BUSINESS', businessName: 'Acme Shuttles', hasCompletedProfile: true });
    const { container } = renderAt();
    await new Promise((r) => setTimeout(r, 50));
    expect(container).toBeEmptyDOMElement();
  });

  it('prompts for a missing phone number even when the backend flag says the profile is complete', () => {
    signIn({ ownerType: 'INDIVIDUAL', hasCompletedProfile: true, phoneNumber: null });
    renderAt();
    expect(screen.getByText(/needs a phone number/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /complete profile/i })).toHaveAttribute('href', '/dashboard/profile');
  });

  it('does not prompt about the phone number before the profile has loaded', () => {
    signIn({ phoneNumber: undefined });
    const { container } = renderAt();
    expect(container).toBeEmptyDOMElement();
  });

  it('does not ask about documents before the profile (and so the account type) is complete', () => {
    signIn({ roles: ['OWNER'], hasCompletedProfile: false });
    renderAt();
    expect(screen.queryByText(/documents still needed/i)).not.toBeInTheDocument();
  });

  it('hides the vehicle prompt on the page it links to', async () => {
    mockDocuments([ID_APPROVED]);
    signIn({ roles: ['OWNER'], ownerType: 'INDIVIDUAL', hasCompletedProfile: false, hasAddedVehicleToProfile: false });
    renderAt('/owner/vehicles/new');
    expect(screen.queryByRole('link', { name: /add a vehicle/i })).not.toBeInTheDocument();
  });

  it('stops asking for the account type once it is saved, even though the backend keeps hasCompletedProfile false', () => {
    mockDocuments([ID_APPROVED]);
    signIn({ roles: ['OWNER'], ownerType: 'INDIVIDUAL', hasCompletedProfile: false, hasAddedVehicleToProfile: true });
    const { container } = renderAt();
    expect(screen.queryByRole('link', { name: /complete profile/i })).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('still asks a car owner for the account type while none is saved', () => {
    signIn({ roles: ['OWNER'], ownerType: null, hasCompletedProfile: false, hasAddedVehicleToProfile: true });
    renderAt();
    expect(screen.getByText(/choose individual or business/i)).toBeInTheDocument();
  });

  it('does not nag a renter with the owner-only profile flag', () => {
    signIn({ roles: ['RENTER'], hasCompletedProfile: false });
    const { container } = renderAt();
    expect(container).toBeEmptyDOMElement();
  });

  it('can be dismissed', async () => {
    const user = userEvent.setup();
    signIn({ roles: ['OWNER'], hasCompletedProfile: false });
    const { container } = renderAt();

    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(container).toBeEmptyDOMElement();
  });

  it('has no accessibility violations', async () => {
    mockDocuments([]);
    signIn({ roles: ['OWNER'], ownerType: 'INDIVIDUAL', hasCompletedProfile: true, hasAddedVehicleToProfile: false });
    const { container } = renderAt();
    await screen.findByText(/documents still needed/i);
    expect(await axe(container)).toHaveNoViolations();
  });
});
