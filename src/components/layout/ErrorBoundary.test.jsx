// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from './ErrorBoundary';

function Bomb({ shouldThrow }) {
  if (shouldThrow) throw new Error('boom');
  return <div>Safe content</div>;
}

const reload = vi.fn();

beforeEach(() => {
  sessionStorage.clear();
  reload.mockClear();
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** A page whose file is from before a deploy: what React.lazy throws when the import fails. */
function StalePage() {
  throw new TypeError('Failed to fetch dynamically imported module: https://example.com/assets/AdminBookingsPage-OLD.js');
}

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

  it('reloads once to pick up a new build when a page file fails to load, and Try Again reloads too', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <StalePage />
      </ErrorBoundary>
    );
    expect(reload).toHaveBeenCalledTimes(1);

    // Within the loop guard it doesn't reload by itself again; Try Again still loads the page afresh.
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("doesn't reload for an ordinary error", () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(reload).not.toHaveBeenCalled();
  });
});
