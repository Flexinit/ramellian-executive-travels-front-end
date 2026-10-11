// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingStatusTabs from './BookingStatusTabs';

describe('BookingStatusTabs', () => {
  it('puts Confirmed first, with All last', () => {
    render(<BookingStatusTabs value="CONFIRMED" onChange={() => {}} />);
    const tabs = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(tabs[0]).toBe('Confirmed');
    expect(tabs[tabs.length - 1]).toBe('All');
  });

  it('marks the active tab as selected', () => {
    render(<BookingStatusTabs value="PENDING" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /pending payment/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Confirmed' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with the status clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BookingStatusTabs value="CONFIRMED" onChange={onChange} />);

    await user.click(screen.getByRole('tab', { name: /pending payment/i }));
    expect(onChange).toHaveBeenCalledWith('PENDING');
  });

  it('calls onChange with an empty string for the All tab', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BookingStatusTabs value="CONFIRMED" onChange={onChange} />);

    await user.click(screen.getByRole('tab', { name: 'All' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
