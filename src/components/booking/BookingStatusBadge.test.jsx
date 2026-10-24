// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BookingStatusBadge from './BookingStatusBadge';

describe('BookingStatusBadge', () => {
  it('shows Confirmed in green (success), uppercase', () => {
    render(<BookingStatusBadge status="CONFIRMED" />);
    // Two nested spans: Badge's own outer pill (colour + uppercase) wrapping this component's inner
    // icon+label flex wrapper — the text sits in the inner one, so its parent is the one to check.
    const badge = screen.getByText(/confirmed/i).closest('span').parentElement;
    expect(badge).toHaveClass('uppercase');
    expect(badge).toHaveClass('bg-green-50'); // Badge's "success" variant
  });

  it('gives every status its own icon, not just colour', () => {
    const statuses = ['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'REJECTED'];
    const { container, rerender } = render(<BookingStatusBadge status={statuses[0]} />);
    const icons = new Set();
    statuses.forEach((status) => {
      rerender(<BookingStatusBadge status={status} />);
      const svg = container.querySelector('svg');
      icons.add(svg.getAttribute('class'));
    });
    expect(icons.size).toBe(statuses.length); // every status drew a visibly different icon
  });

  it('still shows something sensible for an unknown status', () => {
    render(<BookingStatusBadge status="SOMETHING_NEW" />);
    expect(screen.getByText(/something_new/i)).toBeInTheDocument();
  });
});
