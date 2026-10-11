// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingFilters from './BookingFilters';
import { EMPTY_BOOKING_FILTERS } from '../../lib/bookingFilters';

describe('BookingFilters', () => {
  it('shows every filter field by default, including Status', () => {
    render(<BookingFilters filters={EMPTY_BOOKING_FILTERS} setFilter={() => {}} />);
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('When')).toBeInTheDocument();
    expect(screen.getByLabelText('Trip Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Mode')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
    expect(screen.getByLabelText('Vehicle')).toBeInTheDocument();
  });

  it('hides Status when showStatus is false', () => {
    render(<BookingFilters filters={EMPTY_BOOKING_FILTERS} setFilter={() => {}} showStatus={false} />);
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
    expect(screen.getByLabelText('When')).toBeInTheDocument();
  });

  it('calls setFilter with the field name and new value when a select changes', async () => {
    const user = userEvent.setup();
    const setFilter = vi.fn();
    render(<BookingFilters filters={EMPTY_BOOKING_FILTERS} setFilter={setFilter} />);

    await user.selectOptions(screen.getByLabelText('Status'), 'CONFIRMED');

    expect(setFilter).toHaveBeenCalledWith('status', 'CONFIRMED');
  });

  it('calls setFilter when the vehicle search text changes', async () => {
    const user = userEvent.setup();
    const setFilter = vi.fn();
    render(<BookingFilters filters={EMPTY_BOOKING_FILTERS} setFilter={setFilter} />);

    await user.type(screen.getByLabelText('Vehicle'), 'P');

    expect(setFilter).toHaveBeenCalledWith('vehicle', 'P');
  });
});
