// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="No vehicles found" />);
    expect(screen.getByText(/no vehicles found/i)).toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    render(<EmptyState title="No results" description="Try adjusting your filters." />);
    expect(screen.getByText(/try adjusting your filters/i)).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(<EmptyState title="No results" />);
    expect(screen.queryByTestId('empty-description')).not.toBeInTheDocument();
  });

  it('renders action button when action prop is provided', () => {
    const action = { label: 'Clear filters', onClick: vi.fn() };
    render(<EmptyState title="No results" action={action} />);
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });

  it('calls action.onClick when action button is clicked', async () => {
    const user = userEvent.setup();
    const action = { label: 'Clear filters', onClick: vi.fn() };
    render(<EmptyState title="No results" action={action} />);
    await user.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(action.onClick).toHaveBeenCalledOnce();
  });

  it('does not render action button when action prop is not provided', () => {
    render(<EmptyState title="No results" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
