// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VehicleHandoverForm from './VehicleHandoverForm';

// The real pad draws to a <canvas>, which jsdom can't render — same stub SignaturePage.test.jsx uses.
vi.mock('../payment/SignaturePad', () => ({
  default: ({ onChange }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => onChange?.('data:image/png;base64,aGk='), [onChange]);
    return <div data-testid="signature-pad-stub" />;
  },
}));

describe('VehicleHandoverForm', () => {
  it('keeps submit disabled until odometer, its photo, fuel level and a signature are all given', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<VehicleHandoverForm type="pickup" onSubmit={onSubmit} />);

    const submit = screen.getByRole('button', { name: /confirm pickup/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/odometer reading/i), '12000');
    await user.selectOptions(screen.getByLabelText(/fuel level/i), 'HALF');
    // The stubbed pad reports a signature as soon as it mounts: only the odometer photo is missing now.
    expect(submit).toBeDisabled();

    await user.upload(screen.getByLabelText(/photo of the odometer/i), new File(['odo'], 'odometer.jpg', { type: 'image/jpeg' }));
    expect(submit).toBeEnabled();
  });

  it('submits the odometer reading as a number, alongside fuel level, notes and the signature', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<VehicleHandoverForm type="return" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/odometer reading/i), '12500');
    await user.upload(screen.getByLabelText(/photo of the odometer/i), new File(['odo'], 'odometer.jpg', { type: 'image/jpeg' }));
    await user.selectOptions(screen.getByLabelText(/fuel level/i), 'FULL');
    await user.type(screen.getByLabelText(/condition notes/i), 'Returned clean.');
    await user.click(screen.getByRole('button', { name: /confirm return/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      odometerReading: 12500,
      fuelLevel: 'FULL',
      conditionNotes: 'Returned clean.',
      damageNoted: false,
      damageDescription: '',
      location: '',
      signature: 'data:image/png;base64,aGk=',
      odometerPhoto: expect.any(File),
    });
    expect(onSubmit.mock.calls[0][0].odometerPhoto.name).toBe('odometer.jpg');
  });

  it('labels the action for the type it was given', () => {
    render(<VehicleHandoverForm type="pickup" onSubmit={() => {}} />);
    expect(screen.getByRole('button', { name: /confirm pickup/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm return/i })).not.toBeInTheDocument();
  });
});
