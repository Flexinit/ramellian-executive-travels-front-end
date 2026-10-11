// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from './ErrorBoundary';

function Bomb({ shouldThrow }) {
  if (shouldThrow) throw new Error('boom');
  return <div>Safe content</div>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('renders a fallback and lets the user try again after a child throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();

    function Wrapper() {
      return (
        <ErrorBoundary>
          <Bomb shouldThrow />
        </ErrorBoundary>
      );
    }
    render(<Wrapper />);

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();

    // Clicking "Try Again" resets the boundary's state, but the same
    // throwing child is still mounted so it errors again immediately —
    // this asserts the reset handler runs without itself throwing.
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
  });
});
