// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import CheckoutPhonePrompt from './CheckoutPhonePrompt';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { CONTACT_KINDS } from '../../lib/cart';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;
const USER = { id: '1', email: 'renter@example.com', firstName: 'Ann', lastName: 'R', phoneNumber: '', hasCompletedProfile: false };

function renderPrompt() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CheckoutPhonePrompt />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  act(() => {
    useAuthStore.setState({ token: 'test-token', user: USER });
    useCartStore.getState().setContact(null);
  });
});

describe('CheckoutPhonePrompt — a signed-in renter is asked for a phone once', () => {
  it('starts with the phone they shared before signing up', () => {
    act(() => useCartStore.getState().setContact({ kind: CONTACT_KINDS.PHONE, value: '0712345678' }));
    renderPrompt();
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('0712345678');
  });

  it('does not start with a shared email address', () => {
    act(() => useCartStore.getState().setContact({ kind: CONTACT_KINDS.EMAIL, value: 'ann@example.com' }));
    renderPrompt();
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('');
  });

  it('refuses an empty number without calling the backend', async () => {
    let called = false;
    server.use(http.patch(`${BASE}/users/me`, () => { called = true; return HttpResponse.json(USER); }));
    const user = userEvent.setup();
    renderPrompt();

    await user.click(screen.getByRole('button', { name: /save phone number/i }));
    expect(screen.getByText(/enter your phone number/i)).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it('saves only the phone to the profile, so later bookings are not asked again', async () => {
    let body;
    server.use(
      http.patch(`${BASE}/users/me`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...USER, phoneNumber: body.phoneNumber });
      })
    );
    const user = userEvent.setup();
    renderPrompt();

    await user.type(screen.getByLabelText(/phone number/i), ' 0712345678 ');
    await user.click(screen.getByRole('button', { name: /save phone number/i }));

    // Saved in the standard form, whichever way it was typed.
    await waitFor(() => expect(body).toEqual({ phoneNumber: '+254712345678' }));
  });
});
