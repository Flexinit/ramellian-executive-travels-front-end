// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import AddRenterModal from './AddRenterModal';
import { groupRentalTerms } from '../../hooks/useRentalTerms';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderModal() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <AddRenterModal isOpen onClose={() => {}} />
    </QueryClientProvider>
  );
}

describe('AddRenterModal (POST /users/admin/renters)', () => {
  it('creates the account with the phone in standard form, and shows the temporary password once', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/users/admin/renters`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'u9', email: body.email, firstName: 'Ann', lastName: 'Lee', temporaryPassword: 'Tmp-4821', accountAlreadyExisted: false });
      })
    );
    renderModal();

    await user.type(screen.getByLabelText(/first name/i), 'Ann');
    await user.type(screen.getByLabelText(/last name/i), 'Lee');
    await user.type(screen.getByLabelText(/^email/i), 'ann@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '0712 345 678');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Tmp-4821')).toBeInTheDocument();
    expect(body).toEqual({ email: 'ann@example.com', firstName: 'Ann', lastName: 'Lee', phoneNumber: '+254712345678' });
  });

  it('says so when the email already has an account', async () => {
    const user = userEvent.setup();
    server.use(http.post(`${BASE}/users/admin/renters`, () => HttpResponse.json({ email: 'ann@example.com', accountAlreadyExisted: true })));
    renderModal();

    await user.type(screen.getByLabelText(/first name/i), 'Ann');
    await user.type(screen.getByLabelText(/last name/i), 'Lee');
    await user.type(screen.getByLabelText(/^email/i), 'ann@example.com');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(screen.getByText(/already has an account/i)).toBeInTheDocument());
  });
});

describe('groupRentalTerms', () => {
  it('groups by category, with uncategorised terms under General', () => {
    expect(groupRentalTerms([{ id: 1, category: 'Drivers' }, { id: 2 }, { id: 3, category: 'Drivers' }])).toEqual([
      { category: 'Drivers', terms: [{ id: 1, category: 'Drivers' }, { id: 3, category: 'Drivers' }] },
      { category: 'General', terms: [{ id: 2 }] },
    ]);
  });
});
