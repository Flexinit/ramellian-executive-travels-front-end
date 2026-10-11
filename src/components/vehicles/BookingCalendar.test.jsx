// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingCalendar from './BookingCalendar';

const d = (day) => new Date(2026, 9, day); // October 2026

const PERIODS = [
  { id: 'b1', start: d(5), end: d(7), status: 'CONFIRMED', vehicleModel: 'Toyota Prado' },
  { id: 'b2', start: d(12), end: d(12), status: 'PENDING', vehicleModel: 'Rolls-Royce Ghost' },
];

describe('BookingCalendar', () => {
  it('shows nothing selected, and a legend of every status present, until a day is clicked', () => {
    render(<BookingCalendar periods={PERIODS} initialMonth={d(1)} />);
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.queryByText('Toyota Prado')).not.toBeInTheDocument();
  });

  it('shows no legend at all when there are no bookings this vehicle/fleet has', () => {
    render(<BookingCalendar periods={[]} initialMonth={d(1)} />);
    expect(screen.queryByLabelText('Legend')).not.toBeInTheDocument();
  });

  it('lists the booking(s) covering a day once it is clicked', async () => {
    const user = userEvent.setup();
    render(<BookingCalendar periods={PERIODS} initialMonth={d(1)} />);

    await user.click(screen.getByText('6')); // inside the 5th–7th booking
    const entry = screen.getByText('Toyota Prado').closest('li');
    expect(within(entry).getByText(/confirmed/i)).toBeInTheDocument();
  });

  it('does nothing when an unbooked day is clicked', async () => {
    const user = userEvent.setup();
    render(<BookingCalendar periods={PERIODS} initialMonth={d(1)} />);

    await user.click(screen.getByText('20'));
    expect(screen.queryByText('Toyota Prado')).not.toBeInTheDocument();
  });

  it('moves to the next/previous month without losing the periods it can show', async () => {
    const user = userEvent.setup();
    render(<BookingCalendar periods={PERIODS} initialMonth={d(1)} />);

    expect(screen.getByText('October 2026')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /next month/i }));
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /previous month/i }));
    expect(screen.getByText('October 2026')).toBeInTheDocument();
  });
});

describe('BookingCalendar — each day marker shows its own vehicle color, ringed in its status color', () => {
  function markerFor(day) {
    return screen.getByText(String(day)).closest('button').querySelector('svg');
  }

  it('tints a period\'s marker to its own vehicleColor, not a shared one', () => {
    const periods = [
      { id: 'b1', start: d(5), end: d(5), status: 'CONFIRMED', vehicleColor: 'Red' },
      { id: 'b2', start: d(6), end: d(6), status: 'CONFIRMED', vehicleColor: 'Blue' },
    ];
    render(<BookingCalendar periods={periods} initialMonth={d(1)} />);

    expect(markerFor(5)).toHaveStyle({ color: '#F87171' }); // red
    expect(markerFor(6)).toHaveStyle({ color: '#60A5FA' }); // blue
  });

  it('falls back to the single vehicleColor prop when a period carries none of its own', () => {
    const periods = [{ id: 'b1', start: d(5), end: d(5), status: 'CONFIRMED' }];
    render(<BookingCalendar periods={periods} vehicleColor="Green" initialMonth={d(1)} />);

    expect(markerFor(5)).toHaveStyle({ color: '#4ADE80' }); // green
  });

  it('still rings the marker in its status color regardless of vehicle color', () => {
    const periods = [{ id: 'b1', start: d(5), end: d(5), status: 'CANCELLED', vehicleColor: 'Red' }];
    render(<BookingCalendar periods={periods} initialMonth={d(1)} />);

    const dayButton = screen.getByText('5').closest('button');
    expect(dayButton.querySelector('.ring-red-400')).toBeInTheDocument();
  });
});
