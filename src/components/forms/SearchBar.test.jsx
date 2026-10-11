// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useSearchParams } from 'react-router-dom';
import { SEARCH_DEBOUNCE_MS } from '../../lib/constants';
import SearchBar from './SearchBar';

function Url() {
  return <p data-testid="url">{useLocation().search}</p>;
}

/** Stands in for a filter panel picking a filter right after the page loads. */
function PickLocation() {
  const [, setParams] = useSearchParams();
  return (
    <button type="button" onClick={() => setParams((p) => new URLSearchParams({ ...Object.fromEntries(p), location: 'Mombasa' }), { replace: true })}>
      pick
    </button>
  );
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('SearchBar', () => {
  it('writes what is typed to the URL once typing pauses, and clears it when emptied', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><SearchBar /><Url /></MemoryRouter>);
    await user.type(screen.getByRole('searchbox'), 'prado');
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('query=prado'), { timeout: 3000 });

    await user.clear(screen.getByRole('searchbox'));
    await waitFor(() => expect(screen.getByTestId('url')).not.toHaveTextContent('query='), { timeout: 3000 });
  });

  it('starts from the query already in the URL, without rewriting it', () => {
    render(<MemoryRouter initialEntries={['/vehicles?query=noah']}><SearchBar /><Url /></MemoryRouter>);
    expect(screen.getByRole('searchbox')).toHaveValue('noah');
    expect(screen.getByTestId('url')).toHaveTextContent('?query=noah');
  });

  it('does not wipe a filter picked before its delay runs out', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><SearchBar /><PickLocation /><Url /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'pick' }));
    expect(screen.getByTestId('url')).toHaveTextContent('location=Mombasa');

    await wait(SEARCH_DEBOUNCE_MS + 250);
    expect(screen.getByTestId('url')).toHaveTextContent('location=Mombasa');
  });

  it('keeps a filter picked while typing', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><SearchBar /><PickLocation /><Url /></MemoryRouter>);
    await user.type(screen.getByRole('searchbox'), 'noah');
    await user.click(screen.getByRole('button', { name: 'pick' }));
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('query=noah'), { timeout: 3000 });
    expect(screen.getByTestId('url')).toHaveTextContent('location=Mombasa');
  });
});
