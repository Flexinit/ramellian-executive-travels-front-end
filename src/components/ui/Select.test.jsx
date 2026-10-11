// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import Select from './Select';

const options = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
];

describe('Select', () => {
  it('renders a label and combobox', () => {
    render(<Select label="Fuel Type" name="fuelType" options={options} />);
    expect(screen.getByLabelText(/fuel type/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<Select label="Fuel Type" name="fuelType" options={options} />);
    expect(screen.getByRole('option', { name: /petrol/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /diesel/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /electric/i })).toBeInTheDocument();
  });

  it('includes a default empty option', () => {
    render(<Select label="Fuel Type" name="fuelType" options={options} />);
    expect(screen.getByRole('option', { name: /select/i })).toBeInTheDocument();
  });

  it('shows error when error prop is provided', () => {
    render(<Select label="Fuel Type" name="fuelType" options={options} error="Required" />);
    expect(screen.getByText(/required/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('allows selecting a value', async () => {
    const user = userEvent.setup();
    render(<Select label="Fuel Type" name="fuelType" options={options} />);
    await user.selectOptions(screen.getByRole('combobox'), 'diesel');
    expect(screen.getByRole('combobox')).toHaveValue('diesel');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Select label="Fuel Type" name="fuelType" options={options} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
