// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { markCodeSent, getCodeSentAt } from '../lib/codeTimer';
import VerifyEmailPage from './VerifyEmailPage';

const BASE = 'http://192.168.8.11:8080/api/v1';
const EMAIL = 'ann@example.com';

function renderPage(state = { email: EMAIL }) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{ pathname: '/auth/verify-email', state }]}>
          <VerifyEmailPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

const secondsLeft = () => Number(/(\d+) seconds/.exec(screen.getByRole('timer').getAttribute('aria-label'))[1]);

afterEach(() => sessionStorage.clear());

describe('VerifyEmailPage code timer', () => {
  it('shows a round one-minute countdown right after a code was sent', () => {
    markCodeSent(EMAIL);
    renderPage();

    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(secondsLeft()).toBeGreaterThanOrEqual(59);
    expect(screen.getByText(/time left to enter your code/i)).toBeInTheDocument();
    // The form is right there while it runs, and there's no resend yet.
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /resend code/i })).not.toBeInTheDocument();
  });

  it('keeps the true time left across a reload instead of restarting', () => {
    markCodeSent(EMAIL, Date.now() - 35_000);
    renderPage();

    expect(secondsLeft()).toBeLessThanOrEqual(25);
    expect(secondsLeft()).toBeGreaterThanOrEqual(23);
  });

  it('offers a fresh code when time runs out', async () => {
    markCodeSent(EMAIL, Date.now() - 58_000);
    renderPage();

    expect(await screen.findByText(/time's up/i, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend code/i })).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });

  it('starts already expired if the last code was sent over a minute ago', () => {
    markCodeSent(EMAIL, Date.now() - 5 * 60_000);
    renderPage();

    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.getByText(/time's up/i)).toBeInTheDocument();
  });

  it('resending asks the backend for a new code and restarts the countdown', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/auth/resend-verification`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 200 });
      })
    );
    markCodeSent(EMAIL, Date.now() - 5 * 60_000);
    renderPage();

    await user.click(screen.getByRole('button', { name: /resend code/i }));

    expect(await screen.findByRole('timer')).toBeInTheDocument();
    expect(body).toEqual({ email: EMAIL });
    expect(secondsLeft()).toBeGreaterThanOrEqual(59);
    expect(screen.queryByRole('button', { name: /resend code/i })).not.toBeInTheDocument();
    expect(Date.now() - getCodeSentAt(EMAIL)).toBeLessThan(5000);
  });

  it('shows why a resend failed and keeps the resend button', async () => {
    const user = userEvent.setup();
    server.use(http.post(`${BASE}/auth/resend-verification`, () => HttpResponse.json({ message: 'Too many requests' }, { status: 429 })));
    markCodeSent(EMAIL, Date.now() - 5 * 60_000);
    renderPage();

    await user.click(screen.getByRole('button', { name: /resend code/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/too many requests/i);
    expect(screen.getByRole('button', { name: /resend code/i })).toBeInTheDocument();
  });

  it('shows no timer to someone who arrives without a code just sent, but lets them resend', () => {
    renderPage();

    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.getByText(/didn't get a code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend code/i })).toBeInTheDocument();
  });

  it('asks for an email first when there is none, and only then allows a resend', async () => {
    const user = userEvent.setup();
    renderPage({});

    expect(screen.getByRole('button', { name: /resend code/i })).toBeDisabled();
    await user.type(screen.getByLabelText(/^email$/i), 'bob@example.com');
    expect(screen.getByRole('button', { name: /resend code/i })).toBeEnabled();
  });

  it('still verifies the code as before', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/auth/verify-email`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ message: 'ok' });
      })
    );
    markCodeSent(EMAIL);
    renderPage();

    await user.type(screen.getByLabelText(/verification code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify email/i }));

    await waitFor(() => expect(body).toEqual({ email: EMAIL, code: '123456' }));
  });
});

describe('VerifyEmailPage — WhatsApp is hidden for now', () => {
  it('offers no switch to WhatsApp', () => {
    markCodeSent(EMAIL);
    renderPage();
    expect(screen.queryByRole('button', { name: /whatsapp/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/prefer whatsapp/i)).not.toBeInTheDocument();
  });

  it('treats an account registered with the WhatsApp channel as an email verification', () => {
    markCodeSent(EMAIL);
    renderPage({ email: EMAIL, channel: 'WHATSAPP', phoneNumber: '0712345678' });
    expect(screen.getByRole('heading', { name: /verify your email/i })).toBeInTheDocument();
    expect(screen.queryByText(/whatsapp/i)).not.toBeInTheDocument();
  });
});

describe('VerifyEmailPage — WhatsApp (feature switched on)', () => {
  beforeEach(() => vi.stubEnv('VITE_ENABLE_WHATSAPP_VERIFICATION', 'true'));
  afterEach(() => vi.unstubAllEnvs());

  const WA_STATE = { email: EMAIL, channel: 'WHATSAPP', phoneNumber: '0712345678' };

  it('says the code went to WhatsApp, showing only the last digits of the number', () => {
    markCodeSent(EMAIL);
    renderPage(WA_STATE);
    expect(screen.getByRole('heading', { name: /verify on whatsapp/i })).toBeInTheDocument();
    expect(screen.getByText(/6-digit code to your whatsapp/i)).toHaveTextContent('678');
    expect(screen.getByText(/6-digit code to your whatsapp/i)).not.toHaveTextContent('0712345678');
  });

  it('verifies the code with /auth/verify-whatsapp, identifying the account by email', async () => {
    const user = userEvent.setup();
    let body;
    let emailCalled = false;
    server.use(
      http.post(`${BASE}/auth/verify-whatsapp`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ message: 'ok' });
      }),
      http.post(`${BASE}/auth/verify-email`, () => {
        emailCalled = true;
        return HttpResponse.json({});
      })
    );
    markCodeSent(EMAIL);
    renderPage(WA_STATE);

    await user.type(screen.getByLabelText(/verification code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify whatsapp/i }));

    await waitFor(() => expect(body).toEqual({ email: EMAIL, code: '123456' }));
    expect(emailCalled).toBe(false);
  });

  it("shows the backend's reason when the code is wrong or expired", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE}/auth/verify-whatsapp`, () =>
        HttpResponse.json({ status: 400, message: 'Invalid or expired verification code' }, { status: 400 })
      )
    );
    markCodeSent(EMAIL);
    renderPage(WA_STATE);
    await user.type(screen.getByLabelText(/verification code/i), '000000');
    await user.click(screen.getByRole('button', { name: /verify whatsapp/i }));
    expect(await screen.findByText(/invalid or expired verification code/i)).toBeInTheDocument();
  });

  it('resends the code on WhatsApp (not by email) and restarts the countdown', async () => {
    const user = userEvent.setup();
    let whatsappBody;
    let emailResends = 0;
    server.use(
      http.post(`${BASE}/auth/send-whatsapp-code`, async ({ request }) => {
        whatsappBody = await request.json();
        return new HttpResponse(null, { status: 200 });
      }),
      http.post(`${BASE}/auth/resend-verification`, () => {
        emailResends += 1;
        return new HttpResponse(null, { status: 200 });
      })
    );
    markCodeSent(EMAIL, Date.now() - 90_000);
    renderPage(WA_STATE);

    await user.click(screen.getByRole('button', { name: /resend code/i }));

    await waitFor(() => expect(whatsappBody).toEqual({ email: EMAIL }));
    expect(emailResends).toBe(0);
    expect(await screen.findByRole('timer')).toBeInTheDocument();
  });

  it('lets someone who registered with email get the code on WhatsApp instead', async () => {
    const user = userEvent.setup();
    let whatsappBody;
    server.use(
      http.post(`${BASE}/auth/send-whatsapp-code`, async ({ request }) => {
        whatsappBody = await request.json();
        return new HttpResponse(null, { status: 200 });
      })
    );
    markCodeSent(EMAIL);
    renderPage();
    expect(screen.getByRole('heading', { name: /verify your email/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /get the code on whatsapp instead/i }));

    await waitFor(() => expect(whatsappBody).toEqual({ email: EMAIL }));
    expect(await screen.findByRole('heading', { name: /verify on whatsapp/i })).toBeInTheDocument();
  });

  it('stays on email and explains when the account has no WhatsApp number', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE}/auth/send-whatsapp-code`, () => HttpResponse.json({ status: 404, message: 'User not found' }, { status: 404 }))
    );
    markCodeSent(EMAIL);
    renderPage();
    await user.click(screen.getByRole('button', { name: /get the code on whatsapp instead/i }));

    expect(await screen.findByText(/user not found/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /verify your email/i })).toBeInTheDocument();
  });

  it('lets someone on WhatsApp switch back to email', async () => {
    const user = userEvent.setup();
    let resendBody;
    server.use(
      http.post(`${BASE}/auth/resend-verification`, async ({ request }) => {
        resendBody = await request.json();
        return new HttpResponse(null, { status: 200 });
      })
    );
    markCodeSent(EMAIL);
    renderPage(WA_STATE);
    await user.click(screen.getByRole('button', { name: /get the code by email instead/i }));

    await waitFor(() => expect(resendBody).toEqual({ email: EMAIL }));
    expect(await screen.findByRole('heading', { name: /verify your email/i })).toBeInTheDocument();
  });
});

