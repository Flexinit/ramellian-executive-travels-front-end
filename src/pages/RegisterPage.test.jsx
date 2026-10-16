// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { getCodeSentAt } from '../lib/codeTimer';
import RegisterPage from './RegisterPage';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderPage(route = '/') {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <RegisterPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

async function fillForm(user) {
  await user.type(screen.getByLabelText('First Name'), 'Ann');
  await user.type(screen.getByLabelText('Last Name'), 'Lee');
  await user.type(screen.getByLabelText('Email'), 'ann@example.com');
  await user.type(screen.getByLabelText(/phone number/i), '0712 345 678');
  await user.type(screen.getByLabelText('Password'), 'supersecret1!');
  await user.type(screen.getByLabelText('Confirm Password'), 'supersecret1!');
  await user.click(screen.getByLabelText(/terms of service/i));
}

afterEach(() => localStorage.clear());

describe('RegisterPage backdrop', () => {
  it('sits on a photo backdrop, with the form still usable', () => {
    renderPage();
    expect(screen.getByTestId('auth-backdrop').querySelector('img')).toHaveAttribute('src');
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });
});

describe('RegisterPage account type', () => {
  it('does not ask whether the person is an Individual or a Business — that is chosen in the profile', () => {
    renderPage();
    expect(screen.queryByRole('radio', { name: /individual|business/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/registering as/i)).not.toBeInTheDocument();
  });

  it('sends only what the backend registers: name, email and password', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/auth/register`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ message: 'ok' }, { status: 201 });
      })
    );
    renderPage();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toEqual({ firstName: 'Ann', lastName: 'Lee', email: 'ann@example.com', password: 'supersecret1!' });
  });

  it('starts the verify page\'s one-minute code countdown when the account is created', async () => {
    const user = userEvent.setup();
    server.use(http.post(`${BASE}/auth/register`, () => HttpResponse.json({ message: 'ok' }, { status: 201 })));
    renderPage();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(getCodeSentAt('ann@example.com')).not.toBeNull());
    expect(Date.now() - getCodeSentAt('ann@example.com')).toBeLessThan(5000);
  });
});

describe('RegisterPage — phone number', () => {
  it('asks for a phone number and will not register without it (it is saved to the profile after sign-in)', async () => {
    const user = userEvent.setup();
    let called = false;
    server.use(http.post(`${BASE}/auth/register`, () => { called = true; return HttpResponse.json({ message: 'ok' }, { status: 201 }); }));
    renderPage();
    await fillForm(user);
    await user.clear(screen.getByLabelText(/phone number/i));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/enter your phone number/i)).toBeInTheDocument();
    expect(called).toBe(false);
  });
});

describe('RegisterPage — WhatsApp verification is hidden for now', () => {
  it('does not offer WhatsApp: no channel choice and no WhatsApp number', () => {
    renderPage();
    expect(screen.queryByRole('radiogroup', { name: /verification code/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'WhatsApp' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/whatsapp number/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/send my verification code by/i)).not.toBeInTheDocument();
  });

  it('registers exactly as before: name, email and password only', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/auth/register`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ message: 'ok' }, { status: 201 });
      })
    );
    renderPage();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(body).toBeDefined());
    expect(body).toEqual({ firstName: 'Ann', lastName: 'Lee', email: 'ann@example.com', password: 'supersecret1!' });
  });
});

describe('RegisterPage — verify by email or WhatsApp (feature switched on)', () => {
  beforeEach(() => vi.stubEnv('VITE_ENABLE_WHATSAPP_VERIFICATION', 'true'));
  afterEach(() => vi.unstubAllEnvs());

  function capture(holder) {
    server.use(
      http.post(`${BASE}/auth/register`, async ({ request }) => {
        holder.body = await request.json();
        return HttpResponse.json({ message: 'ok' }, { status: 201 });
      })
    );
  }

  it('sends the code by email by default, with nothing about WhatsApp in the request', async () => {
    const user = userEvent.setup();
    const sent = {};
    capture(sent);
    renderPage();
    expect(screen.getByRole('radio', { name: 'Email' })).toBeChecked();
    expect(screen.queryByLabelText(/whatsapp number/i)).not.toBeInTheDocument();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(sent.body).toBeDefined());
    expect(sent.body).toEqual({ firstName: 'Ann', lastName: 'Lee', email: 'ann@example.com', password: 'supersecret1!' });
  });

  it('asks for a WhatsApp number when WhatsApp is chosen, and will not register without it', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillForm(user);
    await user.click(screen.getByRole('radio', { name: 'WhatsApp' }));
    expect(screen.getByLabelText(/whatsapp number/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/whatsapp number/i));
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/enter your phone number/i)).toBeInTheDocument();
  });

  it('registers with the phone number and the WhatsApp channel', async () => {
    const user = userEvent.setup();
    const sent = {};
    capture(sent);
    renderPage();
    await fillForm(user);
    await user.click(screen.getByRole('radio', { name: 'WhatsApp' }));
    await user.clear(screen.getByLabelText(/whatsapp number/i));
    await user.type(screen.getByLabelText(/whatsapp number/i), '0712 345 678');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(sent.body).toBeDefined());
    expect(sent.body).toEqual({
      firstName: 'Ann', lastName: 'Lee', email: 'ann@example.com', password: 'supersecret1!',
      phoneNumber: '+254712345678', verificationChannel: 'WHATSAPP',
    });
    expect(sent.body).not.toHaveProperty('verifyVia');
  });

  it('does not send a phone number typed earlier if the person goes back to email', async () => {
    const user = userEvent.setup();
    const sent = {};
    capture(sent);
    renderPage();
    await fillForm(user);
    await user.click(screen.getByRole('radio', { name: 'WhatsApp' }));
    await user.click(screen.getByRole('radio', { name: 'Email' }));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(sent.body).toBeDefined());
    expect(sent.body).not.toHaveProperty('phoneNumber');
    expect(sent.body).not.toHaveProperty('verificationChannel');
  });
  it('remembers that someone came in through "List Your Car" (?as=owner), so their first login opens the owner setup', () => {
    window.sessionStorage.clear();
    renderPage('/auth/register?as=owner');
    expect(window.sessionStorage.getItem('ramellian.intent')).toBe('owner');
  });

  it('remembers nothing when they came in any other way', () => {
    window.sessionStorage.clear();
    renderPage('/auth/register');
    expect(window.sessionStorage.getItem('ramellian.intent')).toBeNull();
  });
});

describe('RegisterPage — agreeing to the Terms of Service and Privacy Policy', () => {
  it('will not register without the box checked', async () => {
    const user = userEvent.setup();
    let called = false;
    server.use(http.post(`${BASE}/auth/register`, () => { called = true; return HttpResponse.json({ message: 'ok' }, { status: 201 }); }));
    renderPage();
    await user.type(screen.getByLabelText('First Name'), 'Ann');
    await user.type(screen.getByLabelText('Last Name'), 'Lee');
    await user.type(screen.getByLabelText('Email'), 'ann@example.com');
    await user.type(screen.getByLabelText('Password'), 'supersecret1!');
    await user.type(screen.getByLabelText('Confirm Password'), 'supersecret1!');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText(/required to create an account/i)).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it('links to the real Terms and Privacy pages', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /terms of service/i })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy');
  });

  it('never sends the agreement itself to the backend — the live RegisterRequest has no field for it', async () => {
    const user = userEvent.setup();
    let body;
    server.use(http.post(`${BASE}/auth/register`, async ({ request }) => { body = await request.json(); return HttpResponse.json({ message: 'ok' }, { status: 201 }); }));
    renderPage();
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).not.toHaveProperty('agreeToTerms');
  });
});

