// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import ForgotPasswordPage from './ForgotPasswordPage';
import LoginPage from './LoginPage';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderAt(path = '/auth/forgot-password') {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe('ForgotPasswordPage', () => {
  it('emails a code, then sets the new password and goes to Log In with the email filled in', async () => {
    const user = userEvent.setup();
    const sent = {};
    server.use(
      http.post(`${BASE}/auth/forgot-password`, async ({ request }) => {
        sent.forgot = await request.json();
        return new HttpResponse(null, { status: 200 });
      }),
      http.post(`${BASE}/auth/reset-password`, async ({ request }) => {
        sent.reset = await request.json();
        return new HttpResponse(null, { status: 200 });
      })
    );
    renderAt();

    await user.type(screen.getByLabelText('Email'), 'ann@example.com');
    await user.click(screen.getByRole('button', { name: /send code/i }));
    expect(await screen.findByRole('heading', { name: /check your email/i })).toBeInTheDocument();
    expect(sent.forgot).toEqual({ email: 'ann@example.com' });

    await user.type(screen.getByLabelText('6-digit code'), '123456');
    await user.type(screen.getByLabelText('New password'), 'NewPass1!');
    await user.type(screen.getByLabelText('Confirm new password'), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(sent.reset).toEqual({ email: 'ann@example.com', code: '123456', newPassword: 'NewPass1!' });
    expect(screen.getByLabelText('Email')).toHaveValue('ann@example.com');
  });

  it('checks the code and the new password before sending', async () => {
    const user = userEvent.setup();
    server.use(http.post(`${BASE}/auth/forgot-password`, () => new HttpResponse(null, { status: 200 })));
    renderAt();
    await user.type(screen.getByLabelText('Email'), 'ann@example.com');
    await user.click(screen.getByRole('button', { name: /send code/i }));
    await screen.findByRole('heading', { name: /check your email/i });

    await user.type(screen.getByLabelText('6-digit code'), '12');
    await user.type(screen.getByLabelText('New password'), 'short');
    await user.type(screen.getByLabelText('Confirm new password'), 'other');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/enter the 6-digit code/i)).toBeInTheDocument();
    expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
  });

  it("shows the backend's message when the code is wrong", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE}/auth/forgot-password`, () => new HttpResponse(null, { status: 200 })),
      http.post(`${BASE}/auth/reset-password`, () => HttpResponse.json({ message: 'Invalid or expired code' }, { status: 400 }))
    );
    renderAt();
    await user.type(screen.getByLabelText('Email'), 'ann@example.com');
    await user.click(screen.getByRole('button', { name: /send code/i }));
    await screen.findByRole('heading', { name: /check your email/i });
    await user.type(screen.getByLabelText('6-digit code'), '999999');
    await user.type(screen.getByLabelText('New password'), 'NewPass1!');
    await user.type(screen.getByLabelText('Confirm new password'), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));
    await waitFor(() => expect(screen.getByText('Invalid or expired code')).toBeInTheDocument());
  });

  it('is linked from Log In', () => {
    renderAt('/auth/login');
    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute('href', '/auth/forgot-password');
  });
});
