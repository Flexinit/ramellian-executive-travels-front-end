// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingPolicyForm, { policySummary } from './BookingPolicyForm';

const POLICY = { freeCancellationWindowHours: 24, cancellationDeadlineHours: 2, lateCancellationRefundPct: 50, postponementAllowed: true, postponementDeadlineHours: 48, maxPostponements: 2 };

describe('BookingPolicyForm', () => {
  it('starts from the current policy and saves every field the backend requires', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<BookingPolicyForm policy={POLICY} onSave={onSave} />);

    await user.clear(screen.getByLabelText(/late refund/i));
    await user.type(screen.getByLabelText(/late refund/i), '30');
    await user.click(screen.getByRole('button', { name: /save policy/i }));

    expect(onSave).toHaveBeenCalledWith({ ...POLICY, lateCancellationRefundPct: 30 });
  });

  it('sends 0 for the date-moving numbers when moving dates is not allowed', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<BookingPolicyForm policy={POLICY} onSave={onSave} />);

    await user.click(screen.getByLabelText(/can move their booking/i));
    expect(screen.queryByLabelText(/how many times/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /save policy/i }));

    expect(onSave).toHaveBeenCalledWith({ ...POLICY, postponementAllowed: false, postponementDeadlineHours: 0, maxPostponements: 0 });
  });

  it('refuses a refund over 100% or a cut-off later than the free window', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<BookingPolicyForm policy={{ ...POLICY, lateCancellationRefundPct: 120, cancellationDeadlineHours: 30 }} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /save policy/i }));

    expect(screen.getByText(/percentage from 0 to 100/i)).toBeInTheDocument();
    expect(screen.getByText(/no more than the free-cancellation window/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('policySummary', () => {
  it('says what renters get, in plain words', () => {
    expect(policySummary(POLICY)).toEqual([
      'Free cancellation, full refund, up to 24 hours before pick-up.',
      'Later than that, but at least 2 hours before pick-up: 50% refund.',
      'No cancelling within 2 hours of pick-up.',
      'Renters can move their dates up to 48 hours before pick-up, at most 2 times.',
    ]);
  });
});
