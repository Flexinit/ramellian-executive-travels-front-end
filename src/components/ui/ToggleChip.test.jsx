// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import ToggleChip from './ToggleChip';

describe('ToggleChip', () => {
  it('shows whether it is on through aria-pressed and the gold outline', () => {
    const { rerender } = render(<ToggleChip active={false}>Safari</ToggleChip>);
    expect(screen.getByRole('button', { name: 'Safari' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button')).not.toHaveClass('bg-accent');

    rerender(<ToggleChip active>Safari</ToggleChip>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button')).toHaveClass('bg-accent', 'text-on-accent');
  });

  it('calls onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ToggleChip onClick={onClick}>Wedding</ToggleChip>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is a pill', () => {
    render(<ToggleChip>Pill</ToggleChip>);
    expect(screen.getByRole('button')).toHaveClass('rounded-full');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ToggleChip active>Accessible</ToggleChip>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
