// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { axe } from 'jest-axe';
import CircularCountdown from './CircularCountdown';

afterEach(() => {
  vi.useRealTimers();
});

function start(props = {}) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-24T10:00:00Z'));
  const startedAt = Date.now();
  return { startedAt, ...render(<CircularCountdown startedAt={startedAt} {...props} />) };
}

describe('CircularCountdown', () => {
  it('starts at the full duration', () => {
    start();
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', '60 seconds left');
  });

  it('counts down each second', () => {
    start();
    act(() => vi.advanceTimersByTime(15_000));
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', '45 seconds left');
  });

  it('shows the remaining seconds in the middle of the ring', () => {
    start();
    act(() => vi.advanceTimersByTime(20_000));
    expect(screen.getByText('40')).toBeInTheDocument();
  });

  it('drains the ring as time passes', () => {
    const { container } = start();
    const ring = () => container.querySelectorAll('circle')[1];
    const full = Number(ring().getAttribute('stroke-dashoffset'));
    act(() => vi.advanceTimersByTime(30_000));
    expect(Number(ring().getAttribute('stroke-dashoffset'))).toBeGreaterThan(full);
  });

  it('turns red for the last 10 seconds', () => {
    const { container } = start();
    const ring = () => container.querySelectorAll('circle')[1];
    expect(ring().getAttribute('class')).toContain('text-accent');

    act(() => vi.advanceTimersByTime(52_000));
    expect(ring().getAttribute('class')).toContain('text-red-600');
  });

  it('calls onExpire exactly once at zero and stops at 0', () => {
    const onExpire = vi.fn();
    start({ onExpire });

    act(() => vi.advanceTimersByTime(59_000));
    expect(onExpire).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(5_000));
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', '0 seconds left');
  });

  it('continues from where it should be when started earlier (e.g. after a reload)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T10:00:40Z'));
    render(<CircularCountdown startedAt={new Date('2026-09-24T10:00:00Z').getTime()} />);
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', '20 seconds left');
  });

  it('shows 0 straight away if the time is already up', () => {
    const onExpire = vi.fn();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T10:05:00Z'));
    render(<CircularCountdown startedAt={new Date('2026-09-24T10:00:00Z').getTime()} onExpire={onExpire} />);
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', '0 seconds left');
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('restarts when given a new start time', () => {
    const { startedAt, rerender } = start();
    act(() => vi.advanceTimersByTime(40_000));
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', '20 seconds left');

    rerender(<CircularCountdown startedAt={startedAt + 40_000} />);
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', '60 seconds left');
  });

  it('has no accessibility violations', async () => {
    vi.useRealTimers();
    const { container } = render(<CircularCountdown startedAt={Date.now()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
