// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { axe } from 'jest-axe';
import FleetPage from './FleetPage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FleetPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe('FleetPage', () => {
  it('renders the vehicle grid with no date filter, in browse mode', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /our fleet/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/start date/i)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Toyota Noah')).toBeInTheDocument());
  });

  it('filters vehicles by tier tab', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText('Toyota Noah')).toBeInTheDocument());

    await user.click(screen.getByRole('tab', { name: 'Executive' }));
    expect(screen.queryByText('Toyota Noah')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Standard' }));
    expect(screen.getByText('Toyota Noah')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderPage();
    await waitFor(() => expect(screen.getByText('Toyota Noah')).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
