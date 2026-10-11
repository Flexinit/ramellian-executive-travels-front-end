// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RenterNotesTextarea from './RenterNotesTextarea';
import { useBookingStore } from '../../store/bookingStore';

beforeEach(() => useBookingStore.getState().resetDraft?.());

describe('RenterNotesTextarea — no phone numbers', () => {
  it('lets ordinary instructions through untouched', async () => {
    const user = userEvent.setup();
    render(<RenterNotesTextarea />);
    await user.type(screen.getByLabelText(/special instructions/i), 'Please arrive at 09:30, 5 passengers');
    expect(screen.getByLabelText(/special instructions/i)).toHaveValue('Please arrive at 09:30, 5 passengers');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('removes a phone number as it is typed, and says so', async () => {
    const user = userEvent.setup();
    render(<RenterNotesTextarea />);
    const box = screen.getByLabelText(/special instructions/i);
    await user.type(box, 'call me on 0712345678');

    expect(box.value).not.toMatch(/07\d/);
    expect(box.value).toContain('[phone number removed]');
    expect(screen.getByRole('status')).toHaveTextContent(/phone numbers can't be shared here/i);
    expect(useBookingStore.getState().draft.renterNotes).not.toMatch(/07\d/);
  });

  it('removes a number with a country code too', async () => {
    const user = userEvent.setup();
    render(<RenterNotesTextarea />);
    const box = screen.getByLabelText(/special instructions/i);
    await user.type(box, 'reach me +254 733 111 222');
    expect(box.value).not.toMatch(/254|733/);
  });
});
