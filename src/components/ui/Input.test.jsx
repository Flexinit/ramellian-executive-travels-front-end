// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import Input from './Input';

describe('Input', () => {
  it('renders a label and input', () => {
    render(<Input label="Email" name="email" />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('shows an error message when error prop is provided', () => {
    render(<Input label="Email" name="email" error="Email is required" />);
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a hint when hint prop is provided', () => {
    render(<Input label="Password" name="password" hint="At least 8 characters" />);
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('does not show hint when error is also present (error takes priority)', () => {
    render(<Input label="Email" name="email" hint="Hint text" error="Error text" />);
    expect(screen.getByText(/error text/i)).toBeInTheDocument();
    expect(screen.queryByText(/hint text/i)).not.toBeInTheDocument();
  });

  it('accepts user input', async () => {
    const user = userEvent.setup();
    render(<Input label="Name" name="name" />);
    const input = screen.getByLabelText(/name/i);
    await user.type(input, 'Ramellian');
    expect(input).toHaveValue('Ramellian');
  });

  it('applies register props when provided', () => {
    const register = { name: 'email', ref: vi.fn(), onChange: vi.fn(), onBlur: vi.fn() };
    render(<Input label="Email" name="email" register={register} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('passes through type prop', () => {
    render(<Input label="Password" name="password" type="password" />);
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Input label="Email address" name="email" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with error', async () => {
    const { container } = render(
      <Input label="Email address" name="email" error="Required field" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
