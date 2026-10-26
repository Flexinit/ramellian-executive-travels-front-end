// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import ProfilePage from './ProfilePage';

// The sections themselves have their own tests; here only which one shows.
vi.mock('../components/profile/SetupSteps', () => ({ default: () => <p>Setup steps</p> }));
vi.mock('../components/profile/SavedSignatureSection', () => ({ default: () => <p>Saved signature</p> }));
vi.mock('../components/profile/SecuritySection', () => ({ default: () => <p>Security settings</p> }));
vi.mock('../components/profile/ProfilePhotoPicker', () => ({ default: () => null }));

function Address() {
  const { search } = useLocation();
  return <output aria-label="address">{search}</output>;
}

function renderAt(url = '/dashboard/profile') {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[url]}>
          <ProfilePage />
          <Address />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe('ProfilePage — tabs', () => {
  it('opens on Details, and shows one section at a time', async () => {
    const user = userEvent.setup();
    renderAt();
    expect(screen.getByRole('tab', { name: 'Details' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Setup steps')).toBeInTheDocument();
    expect(screen.queryByText('Saved signature')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Security' }));
    expect(screen.getByText('Security settings')).toBeInTheDocument();
    expect(screen.queryByText('Setup steps')).not.toBeInTheDocument();
    expect(screen.getByLabelText('address')).toHaveTextContent('?tab=security');
  });

  it('opens the tab named in the address', () => {
    renderAt('/dashboard/profile?tab=signature');
    expect(screen.getByRole('tab', { name: 'Signature' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Saved signature')).toBeInTheDocument();
  });
});
