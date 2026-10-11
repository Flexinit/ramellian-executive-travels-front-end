// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { useAuthStore } from '../../store/authStore';
import SetupGuideModal from './SetupGuideModal';
import SetupSteps from '../profile/SetupSteps';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderAt(route = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <SetupGuideModal />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const ME = { id: '1', email: 'a@example.com', firstName: 'Ann', lastName: 'Lee', phoneNumber: '0712345678', location: 'Nairobi' };

/** Serves GET /users/me and mirrors it into the auth store the way useSyncCurrentUser does. */
function signIn(user) {
  const full = { ...ME, roles: ['RENTER'], ...user };
  server.use(http.get(`${BASE}/users/me`, () => HttpResponse.json(full)));
  act(() => useAuthStore.setState({ token: 'test-token', user: full }));
  return full;
}

/** Records which profile endpoints were called, so a step can be shown to call only its own. */
function trackProfileCalls(responses = {}) {
  const calls = { put: null, patch: null };
  server.use(
    http.put(`${BASE}/users/me/owner-profile`, async ({ request }) => {
      calls.put = await request.json();
      return HttpResponse.json(responses.put ?? { ...ME, roles: ['OWNER'], ownerType: 'INDIVIDUAL', hasCompletedProfile: true });
    }),
    http.patch(`${BASE}/users/me`, async ({ request }) => {
      calls.patch = await request.json();
      return HttpResponse.json(responses.patch ?? { ...ME, roles: ['OWNER'], ...calls.patch });
    })
  );
  return calls;
}

const docsNone = () => http.get(`${BASE}/documents/me`, () => HttpResponse.json([]));
const loaded = () => waitFor(() => expect(screen.getByLabelText(/first name/i)).toHaveValue('Ann'));
const stepLabels = (progress) => within(progress).getAllByRole('listitem').map((li) => li.textContent.replace(/\d+/g, '').trim());

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null }));
  localStorage.clear();
});

describe('SetupGuideModal', () => {
  it('stays closed while the completion flags are unknown', () => {
    signIn({});
    renderAt();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on the first step that needs attention: personal details when the phone number is missing', async () => {
    signIn({ roles: ['OWNER'], hasCompletedProfile: false, phoneNumber: null });
    renderAt();

    expect(await screen.findByRole('dialog', { name: /finish setting up/i })).toBeInTheDocument();
    expect(screen.getByText('Your personal details')).toBeInTheDocument();
  });

  it('skips ahead to account details for a car owner whose personal details are fine', async () => {
    signIn({ roles: ['OWNER'], hasCompletedProfile: false });
    renderAt();

    expect(await screen.findByText('Your account details')).toBeInTheDocument();
    expect(await screen.findByRole('radio', { name: /individual/i })).toBeChecked();
  });

  it('shows one step at a time, in order: personal, account, documents, vehicle (owners)', async () => {
    signIn({ roles: ['OWNER'], hasCompletedProfile: false, phoneNumber: null });
    renderAt();

    const progress = await screen.findByRole('navigation', { name: /progress/i });
    expect(stepLabels(progress)).toEqual(['Personal', 'Account', 'Documents', 'Vehicle']);
    // Only the current step's form is on screen.
    expect(screen.queryByLabelText(/payout provider/i)).not.toBeInTheDocument();
  });

  it('gives a renter just two steps: personal details and documents', async () => {
    signIn({ roles: ['RENTER'], hasCompletedProfile: true, phoneNumber: null });
    renderAt();

    const progress = await screen.findByRole('navigation', { name: /progress/i });
    expect(stepLabels(progress)).toEqual(['Personal', 'Documents']);
  });

  it('personal step: makes the phone number mandatory and calls no endpoint without one', async () => {
    const user = userEvent.setup();
    const calls = trackProfileCalls();
    signIn({ hasCompletedProfile: true, phoneNumber: null });
    renderAt();

    expect(await screen.findByLabelText(/^phone/i)).toHaveAttribute('aria-required', 'true');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    expect(await screen.findByText(/enter your phone number/i)).toBeInTheDocument();
    expect(calls).toEqual({ put: null, patch: null });
  });

  it('personal step: calls only PATCH /users/me (never the owner profile), sends only what changed, then goes straight to the step not done yet', async () => {
    const user = userEvent.setup();
    const calls = trackProfileCalls();
    server.use(docsNone());
    signIn({ roles: ['OWNER'], ownerType: 'INDIVIDUAL', hasCompletedProfile: true, phoneNumber: null });
    renderAt();

    await loaded();
    await user.type(screen.getByLabelText(/^phone/i), '0712 345 678');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    // The account details are already saved, so it skips them and lands on the documents still to upload.
    expect(await screen.findByText('Your documents')).toBeInTheDocument();
    expect(screen.queryByText('Your account details')).not.toBeInTheDocument();
    expect(calls.patch).toEqual({ phoneNumber: '0712 345 678' });
    expect(calls.put).toBeNull();
  });

  it('personal step: has a middle name, sent only when filled in, and limited to 100 characters like the spec', async () => {
    const user = userEvent.setup();
    const calls = trackProfileCalls();
    server.use(docsNone());
    signIn({ roles: ['OWNER'], ownerType: 'INDIVIDUAL', hasCompletedProfile: true, phoneNumber: null });
    renderAt();

    await loaded();
    expect(screen.getByLabelText(/middle name/i)).toHaveValue('');
    await user.type(screen.getByLabelText(/middle name/i), 'M'.repeat(101));
    await user.type(screen.getByLabelText(/^phone/i), '0712345678');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));
    expect(await screen.findByText(/middle name must be 100 characters or fewer/i)).toBeInTheDocument();
    expect(calls.patch).toBeNull();

    await user.clear(screen.getByLabelText(/middle name/i));
    await user.type(screen.getByLabelText(/middle name/i), 'Wanjiru');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));
    await waitFor(() => expect(calls.patch).toEqual({ middleName: 'Wanjiru', phoneNumber: '0712345678' }));
  });

  it('account step: calls only PUT /users/me/owner-profile (never PATCH), then moves on to documents', async () => {
    const user = userEvent.setup();
    const calls = trackProfileCalls();
    server.use(docsNone());
    signIn({ roles: ['OWNER'], hasCompletedProfile: false });
    renderAt();

    await user.click(await screen.findByRole('button', { name: /save & continue/i }));

    expect(await screen.findByText('Your documents')).toBeInTheDocument();
    expect(calls.put).toEqual({ ownerType: 'INDIVIDUAL' });
    expect(calls.patch).toBeNull();
  });

  it('account step: does not require a business name (the spec marks nothing on the owner profile as required)', async () => {
    const user = userEvent.setup();
    const calls = trackProfileCalls();
    server.use(docsNone());
    signIn({ roles: ['OWNER'], hasCompletedProfile: false });
    renderAt();

    await user.click(await screen.findByRole('radio', { name: /business/i }));
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    await waitFor(() => expect(calls.put).toEqual({ ownerType: 'BUSINESS' }));
  });

  it('account step: is where Individual or Business is chosen, showing the business fields only for Business', async () => {
    const user = userEvent.setup();
    signIn({ roles: ['OWNER'], hasCompletedProfile: false });
    renderAt();

    expect(await screen.findByRole('radio', { name: /individual/i })).toBeChecked();
    expect(screen.queryByLabelText(/business name/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /business/i }));
    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
  });

  it("shows the backend's own error inline and stays on the step", async () => {
    const user = userEvent.setup();
    server.use(http.patch(`${BASE}/users/me`, () => HttpResponse.json({ message: 'An unexpected error occurred' }, { status: 500 })));
    signIn({ hasCompletedProfile: true, phoneNumber: null });
    renderAt();

    await loaded();
    await user.type(screen.getByLabelText(/^phone/i), '0712345678');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/personal details.*internal error \(500\)/i);
    expect(screen.getByText('Your personal details')).toBeInTheDocument();
  });

  it('enforces the spec length limits (phone number is at most 30 characters)', async () => {
    const user = userEvent.setup();
    signIn({ hasCompletedProfile: true, phoneNumber: null });
    renderAt();

    await loaded();
    await user.type(screen.getByLabelText(/^phone/i), '1'.repeat(31));
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    expect(await screen.findByText(/phone number must be 30 characters or fewer/i)).toBeInTheDocument();
  });

  it('lets the person do a step later and come back to it', async () => {
    const user = userEvent.setup();
    server.use(docsNone());
    signIn({ roles: ['OWNER'], hasCompletedProfile: false, phoneNumber: null });
    renderAt();

    await screen.findByText('Your personal details');
    await user.click(screen.getByRole('button', { name: /do this later/i }));
    expect(await screen.findByText('Your account details')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(await screen.findByText('Your personal details')).toBeInTheDocument();
  });

  it('documents step then vehicle step: "Add a vehicle" navigates there and closes the window', async () => {
    const user = userEvent.setup();
    server.use(docsNone());
    signIn({ roles: ['OWNER'], ownerType: 'INDIVIDUAL', hasCompletedProfile: true, hasAddedVehicleToProfile: false });
    renderAt();

    // Personal + account are done, no identity document yet → opens on documents.
    expect(await screen.findByText('Your documents')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(await screen.findByText('Your first vehicle')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add a vehicle/i }));

    expect(screen.getByTestId('where')).toHaveTextContent('/owner/vehicles/new');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('"Remind me later" closes it', async () => {
    const user = userEvent.setup();
    signIn({ hasCompletedProfile: true, phoneNumber: null });
    renderAt();

    await user.click(await screen.findByRole('button', { name: /remind me later/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays out of the way on the profile page, which holds the same steps', () => {
    signIn({ hasCompletedProfile: true, phoneNumber: null });
    renderAt('/dashboard/profile');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// The same steps on the Profile page (no modal around them).
function renderSteps() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SetupSteps />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const IDENTITY_APPROVED = { id: 'd1', documentType: 'NATIONAL_ID', reviewStatus: 'APPROVED' };
const docsApproved = () => http.get(`${BASE}/documents/me`, () => HttpResponse.json([IDENTITY_APPROVED]));

describe('Setup steps never start over', () => {
  it('opens on the step that is not done, not on step one, when some of it is already filled in', async () => {
    server.use(docsNone());
    signIn({ roles: ['OWNER'], ownerType: 'INDIVIDUAL', hasCompletedProfile: true, hasAddedVehicleToProfile: true });
    renderSteps();

    expect(await screen.findByText('Your documents')).toBeInTheDocument();
    expect(screen.queryByText('Your personal details')).not.toBeInTheDocument();
  });

  it('marks finished steps as done and leaves the unfinished ones open', async () => {
    server.use(docsNone());
    signIn({ roles: ['OWNER'], ownerType: 'INDIVIDUAL', hasCompletedProfile: true, hasAddedVehicleToProfile: true });
    renderSteps();

    await screen.findByText('Your documents');
    // Personal, Account and Vehicle are done; Documents is the one still to do.
    expect(screen.getAllByTestId('step-complete')).toHaveLength(3);
  });

  it('lets the person open a finished step to edit it later', async () => {
    const user = userEvent.setup();
    server.use(docsNone());
    signIn({ roles: ['OWNER'], ownerType: 'INDIVIDUAL', hasCompletedProfile: true, hasAddedVehicleToProfile: true });
    renderSteps();

    await screen.findByText('Your documents');
    await user.click(screen.getByRole('button', { name: /personal/i }));

    expect(await screen.findByText('Your personal details')).toBeInTheDocument();
    await loaded();
    expect(screen.getByLabelText(/^phone/i)).toHaveValue('0712345678');
  });

  it('says everything is set up once nothing is missing, and every step can still be edited', async () => {
    const user = userEvent.setup();
    server.use(docsApproved());
    signIn({ roles: ['OWNER'], ownerType: 'INDIVIDUAL', hasCompletedProfile: true, hasAddedVehicleToProfile: true });
    renderSteps();

    expect(await screen.findByText(/everything is set up/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /account/i }));
    expect(await screen.findByText('Your account details')).toBeInTheDocument();
  });

  it('after saving the last missing detail it moves to the next thing not done, skipping finished steps', async () => {
    const user = userEvent.setup();
    trackProfileCalls();
    server.use(docsNone());
    signIn({ roles: ['OWNER'], ownerType: 'INDIVIDUAL', hasCompletedProfile: true, hasAddedVehicleToProfile: false, phoneNumber: null });
    renderSteps();

    // Personal details (phone missing) is the first unfinished step.
    await loaded();
    await user.type(screen.getByLabelText(/^phone/i), '0712345678');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    // Account is already done, so the next unfinished step is the documents.
    expect(await screen.findByText('Your documents')).toBeInTheDocument();
  });

  it('closes the setup window by itself when a save leaves nothing unfinished', async () => {
    const user = userEvent.setup();
    trackProfileCalls();
    server.use(docsApproved());
    signIn({ roles: ['OWNER'], ownerType: 'INDIVIDUAL', hasCompletedProfile: true, hasAddedVehicleToProfile: true, phoneNumber: null });
    renderAt();

    await loaded();
    await user.type(screen.getByLabelText(/^phone/i), '0712345678');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
