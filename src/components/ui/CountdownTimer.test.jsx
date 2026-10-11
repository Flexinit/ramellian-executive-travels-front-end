// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import CountdownTimer from './CountdownTimer';

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays remaining time', () => {
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    render(<CountdownTimer expiresAt={expiresAt} onExpired={vi.fn()} />);
    expect(screen.getByText(/\d+:\d+/)).toBeInTheDocument();
  });

  it('counts down each second', () => {
    const expiresAt = Date.now() + 65 * 1000; // 1 min 5 sec
    render(<CountdownTimer expiresAt={expiresAt} onExpired={vi.fn()} />);
    expect(screen.getByText('01:05')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('01:04')).toBeInTheDocument();
  });

  it('calls onExpired when timer reaches zero', () => {
    const onExpired = vi.fn();
    const expiresAt = Date.now() + 2000; // 2 seconds
    render(<CountdownTimer expiresAt={expiresAt} onExpired={onExpired} />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onExpired).toHaveBeenCalledOnce();
  });

  it('shows 00:00 when expired', () => {
    const onExpired = vi.fn();
    const expiresAt = Date.now() + 1000;
    render(<CountdownTimer expiresAt={expiresAt} onExpired={onExpired} />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  it('applies urgent styling when under 2 minutes', () => {
    const expiresAt = Date.now() + 90 * 1000; // 90 seconds
    const { container } = render(<CountdownTimer expiresAt={expiresAt} onExpired={vi.fn()} />);
    expect(container.firstChild).toHaveClass('text-red-400');
  });
});
