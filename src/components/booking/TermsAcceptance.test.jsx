// @vitest-environment jsdom
import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import TermsAcceptance from './TermsAcceptance';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function Harness({ who }) {
  const [ok, setOk] = useState(false);
  return (
    <>
      <TermsAcceptance who={who} checked={ok} onChange={setOk} />
      <button disabled={!ok}>Go on</button>
    </>
  );
}

const renderIt = (who) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <Harness who={who} />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('TermsAcceptance', () => {
  it('keeps the next step off until the terms are accepted', async () => {
    const user = userEvent.setup();
    renderIt('renter');
    expect(screen.getByRole('button', { name: 'Go on' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /accept the terms of service and the rental terms/i }));
    expect(screen.getByRole('button', { name: 'Go on' })).toBeEnabled();
  });

  it("shows an owner the terms for Everyone and Owners — not the renters' ones", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${BASE}/rental-terms`, () =>
        HttpResponse.json([
          { id: '1', title: 'Keep the car insured', content: 'x', category: 'Owners', enabled: true },
          { id: '2', title: 'Return it fuelled', content: 'y', category: 'Renters', enabled: true },
          { id: '3', title: 'Be respectful', content: 'z', enabled: true },
        ])
      )
    );
    renderIt('owner');
    await user.click(screen.getByRole('button', { name: /read them/i }));

    expect(await screen.findByText('Keep the car insured')).toBeInTheDocument();
    expect(screen.getByText('Be respectful')).toBeInTheDocument();
    expect(screen.queryByText('Return it fuelled')).not.toBeInTheDocument();
  });
});
