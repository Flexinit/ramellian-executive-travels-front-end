import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BookingBar from './BookingBar';

function renderBar() {
  return render(
    <MemoryRouter>
      <BookingBar />
    </MemoryRouter>
  );
}

describe('BookingBar', () => {
  it('asks for the pick-up place only, until a different return place is asked for', async () => {
    const user = userEvent.setup();
    renderBar();

    expect(screen.getByLabelText('Pick-up Location')).toBeInTheDocument();
    expect(screen.queryByLabelText('Return Location')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /return to a different location/i }));
    const returnBox = screen.getByLabelText('Return Location');
    await user.type(returnBox, 'Diani Beach');

    // Changing their mind hides the box again and forgets what was typed.
    await user.click(screen.getByRole('button', { name: /return to the same place/i }));
    expect(screen.queryByLabelText('Return Location')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /return to a different location/i }));
    expect(screen.getByLabelText('Return Location')).toHaveValue('');
  });

  it('puts pick-up before return', async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole('button', { name: /return to a different location/i }));
    const pickup = screen.getByLabelText('Pick-up Location');
    const ret = screen.getByLabelText('Return Location');
    expect(pickup.compareDocumentPosition(ret) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
