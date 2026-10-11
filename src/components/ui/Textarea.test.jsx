// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import Textarea from './Textarea';

describe('Textarea', () => {
  it('renders label and textarea', () => {
    render(<Textarea label="Notes" name="notes" />);
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('shows character count when maxLength is provided', () => {
    render(<Textarea label="Notes" name="notes" maxLength={100} />);
    expect(screen.getByText(/0 \/ 100/i)).toBeInTheDocument();
  });

  it('updates character count as user types', async () => {
    const user = userEvent.setup();
    render(<Textarea label="Notes" name="notes" maxLength={100} />);
    await user.type(screen.getByLabelText(/notes/i), 'Hello');
    expect(screen.getByText(/5 \/ 100/i)).toBeInTheDocument();
  });

  it('shows error message when error prop is provided', () => {
    render(<Textarea label="Notes" name="notes" error="Notes required" />);
    expect(screen.getByText(/notes required/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('enforces maxLength attribute on textarea element', () => {
    render(<Textarea label="Notes" name="notes" maxLength={1000} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '1000');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Textarea label="Renter notes" name="renterNotes" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
