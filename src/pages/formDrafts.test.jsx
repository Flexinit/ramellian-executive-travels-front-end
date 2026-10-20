// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import { loadDraft } from '../lib/formDraft';
import RegisterPage from './RegisterPage';
import ContactPage from './ContactPage';
import AddVehiclePage from './AddVehiclePage';
import PersonalDetailsForm from '../components/profile/PersonalDetailsForm';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderWith(ui) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

const draftSaved = (key) => waitFor(() => expect(loadDraft(key)).not.toBeNull());

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null }));
});

describe('Register form draft', () => {
  it('keeps name and email across a reload — but never the passwords', async () => {
    const user = userEvent.setup();
    const first = renderWith(<RegisterPage />);
    await user.type(screen.getByLabelText('First Name'), 'Ann');
    await user.type(screen.getByLabelText('Last Name'), 'Lee');
    await user.type(screen.getByLabelText('Email'), 'ann@example.com');
    await user.type(screen.getByLabelText('Password'), 'supersecret1!');
    await user.type(screen.getByLabelText('Confirm Password'), 'supersecret1!');
    await draftSaved('register');

    expect(JSON.stringify(loadDraft('register'))).not.toContain('supersecret1!');
    first.unmount();

    renderWith(<RegisterPage />);
    expect(screen.getByLabelText('First Name')).toHaveValue('Ann');
    expect(screen.getByLabelText('Last Name')).toHaveValue('Lee');
    expect(screen.getByLabelText('Email')).toHaveValue('ann@example.com');
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(screen.getByText(/passwords aren't kept/i)).toBeInTheDocument();
  });

  it('"Start over" clears the restored form', async () => {
    const user = userEvent.setup();
    const first = renderWith(<RegisterPage />);
    await user.type(screen.getByLabelText('First Name'), 'Ann');
    await draftSaved('register');
    first.unmount();

    renderWith(<RegisterPage />);
    await user.click(screen.getByRole('button', { name: /start over/i }));

    expect(screen.getByLabelText('First Name')).toHaveValue('');
    expect(loadDraft('register')).toBeNull();
  });

  it('forgets the draft once the account is created', async () => {
    const user = userEvent.setup();
    server.use(http.post(`${BASE}/auth/register`, () => HttpResponse.json({ message: 'ok' }, { status: 201 })));
    renderWith(<RegisterPage />);
    await user.type(screen.getByLabelText('First Name'), 'Ann');
    await user.type(screen.getByLabelText('Last Name'), 'Lee');
    await user.type(screen.getByLabelText('Email'), 'ann@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '0712 345 678');
    await user.type(screen.getByLabelText('Password'), 'supersecret1!');
    await user.type(screen.getByLabelText('Confirm Password'), 'supersecret1!');
    await draftSaved('register');
    await user.click(screen.getByLabelText(/terms of service/i));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(loadDraft('register')).toBeNull());
  });
});

describe('Contact form draft', () => {
  it('keeps a half-written message across a reload', async () => {
    const user = userEvent.setup();
    const first = renderWith(<ContactPage />);
    await user.type(screen.getByLabelText(/full name/i), 'Ann Lee');
    await user.type(screen.getByLabelText(/message/i), 'I need a car for a wedding');
    await waitFor(() => expect(loadDraft('contact')?.values?.message).toBe('I need a car for a wedding'));
    first.unmount();

    renderWith(<ContactPage />);
    expect(screen.getByLabelText(/full name/i)).toHaveValue('Ann Lee');
    expect(screen.getByLabelText(/message/i)).toHaveValue('I need a car for a wedding');
  });
});

describe('Personal details draft', () => {
  function signIn(profile = {}) {
    const me = { id: 'u1', email: 'a@example.com', roles: ['RENTER'], firstName: 'Ann', lastName: 'Lee', phoneNumber: null, location: null, ...profile };
    server.use(http.get(`${BASE}/users/me`, () => HttpResponse.json(me)));
    act(() => useAuthStore.setState({ token: 'test-token', user: me }));
  }
  const loaded = () => waitFor(() => expect(screen.getByLabelText(/first name/i)).toHaveValue('Ann'));

  it('puts unsaved edits back over the server values after a reload, and still sends only what changed', async () => {
    const user = userEvent.setup();
    let patch;
    server.use(
      http.patch(`${BASE}/users/me`, async ({ request }) => {
        patch = await request.json();
        return HttpResponse.json({ id: 'u1', email: 'a@example.com', roles: ['RENTER'], firstName: 'Ann', lastName: 'Lee', ...patch });
      })
    );
    signIn();
    const first = renderWith(<PersonalDetailsForm />);
    await loaded();
    await user.type(screen.getByLabelText(/^phone/i), '0712345678');
    await draftSaved('personal.u1');
    first.unmount();

    renderWith(<PersonalDetailsForm />);
    await waitFor(() => expect(screen.getByLabelText(/^phone/i)).toHaveValue('0712345678'));
    expect(screen.getByLabelText(/first name/i)).toHaveValue('Ann');

    await user.click(screen.getByRole('button', { name: /save personal details/i }));
    await waitFor(() => expect(patch).toEqual({ phoneNumber: '+254712345678' }));
  });

  it('drops the draft once the details are saved', async () => {
    const user = userEvent.setup();
    server.use(
      http.patch(`${BASE}/users/me`, async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({ id: 'u1', email: 'a@example.com', roles: ['RENTER'], firstName: 'Ann', lastName: 'Lee', ...body });
      })
    );
    signIn();
    renderWith(<PersonalDetailsForm />);
    await loaded();
    await user.type(screen.getByLabelText(/^phone/i), '0712345678');
    await draftSaved('personal.u1');

    await user.click(screen.getByRole('button', { name: /save personal details/i }));
    await waitFor(() => expect(loadDraft('personal.u1')).toBeNull());
  });

  it('keeps each person\'s draft separate', async () => {
    const user = userEvent.setup();
    signIn({ id: 'u1' });
    const first = renderWith(<PersonalDetailsForm />);
    await loaded();
    await user.type(screen.getByLabelText(/^phone/i), '0711111111');
    await draftSaved('personal.u1');
    first.unmount();

    act(() => useAuthStore.setState({ token: 'test-token', user: { id: 'u2', email: 'b@example.com', roles: ['RENTER'] } }));
    server.use(http.get(`${BASE}/users/me`, () => HttpResponse.json({ id: 'u2', email: 'b@example.com', roles: ['RENTER'], firstName: 'Ann', lastName: 'Lee' })));
    renderWith(<PersonalDetailsForm />);
    await loaded();

    expect(screen.getByLabelText(/^phone/i)).toHaveValue('');
  });
});

describe('Add vehicle draft', () => {
  it('keeps the fields and the step you were on across a reload, and says photos are not kept', async () => {
    const user = userEvent.setup();
    act(() => useAuthStore.setState({ token: 'test-token', user: { id: 'u1', email: 'o@example.com', roles: ['OWNER'] } }));

    const first = renderWith(<AddVehiclePage />);
    await user.type(screen.getByLabelText(/^model$/i), 'Toyota Prado');
    await user.type(screen.getByLabelText(/^color$/i), 'Pearl White');
    await user.type(screen.getByLabelText(/^vin$/i), 'VIN123456789');
    await user.type(screen.getByLabelText(/registration number/i), 'KDA 123A');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await screen.findByLabelText(/^location$/i);
    await user.type(screen.getByLabelText(/^location$/i), 'Nairobi CBD');
    await waitFor(() => expect(loadDraft('vehicle.u1')?.extra).toBe(1));
    await waitFor(() => expect(loadDraft('vehicle.u1')?.values?.location).toBe('Nairobi CBD'));
    first.unmount();

    renderWith(<AddVehiclePage />);
    // Back on step two, with what was typed there.
    expect(await screen.findByRole('heading', { name: /price and location/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^location$/i)).toHaveValue('Nairobi CBD');
    expect(screen.getByText(/photos and the insurance sticker aren't kept/i)).toBeInTheDocument();

    // And step one's values are still there too.
    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(await screen.findByLabelText(/^model$/i)).toHaveValue('Toyota Prado');
    expect(screen.getByLabelText(/^vin$/i)).toHaveValue('VIN123456789');
  });

  it('starts fresh once the vehicle has been added', async () => {
    const user = userEvent.setup();
    act(() => useAuthStore.setState({ token: 'test-token', user: { id: 'u1', email: 'o@example.com', roles: ['OWNER'] } }));
    renderWith(<AddVehiclePage />);

    await user.type(screen.getByLabelText(/^model$/i), 'Toyota Prado');
    await user.type(screen.getByLabelText(/^color$/i), 'Pearl White');
    await user.type(screen.getByLabelText(/^vin$/i), 'VIN123456789');
    await user.type(screen.getByLabelText(/registration number/i), 'KDA 123A');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await screen.findByLabelText(/^location$/i);
    await user.type(screen.getByLabelText(/^location$/i), 'Nairobi CBD');
    await user.type(screen.getByLabelText(/price per day/i), '15000');
    await user.type(screen.getByLabelText(/seat capacity/i), '5');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await screen.findByLabelText(/fuel type/i);
    await user.selectOptions(screen.getByLabelText(/fuel type/i), 'DIESEL');
    await user.selectOptions(screen.getByLabelText(/transmission/i), 'AUTOMATIC');
    await user.click(screen.getByRole('checkbox', { name: /comprehensive insurance/i }));
    const sticker = screen.getByLabelText(/add insurance sticker photo/i);
    Object.defineProperty(sticker, 'files', { value: [new File(['x'], 'sticker.jpg', { type: 'image/jpeg' })], configurable: true });
    fireEvent.change(sticker);
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await draftSaved('vehicle.u1');
    await user.click(await screen.findByRole('checkbox', { name: /i have read and accept/i }));
    await user.click(await screen.findByRole('button', { name: /^add vehicle$/i }));

    await screen.findByText(/toyota prado added/i);
    await waitFor(() => expect(loadDraft('vehicle.u1')).toBeNull());
  });
});
