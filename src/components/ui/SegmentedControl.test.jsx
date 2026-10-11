// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import SegmentedControl from './SegmentedControl';

const OPTIONS = [
  { value: 'SELF', label: 'Self-Drive' },
  { value: 'CHAUFFEURED', label: 'Chauffeured' },
];

describe('SegmentedControl', () => {
  it('is a radio group with the selected option checked', () => {
    render(<SegmentedControl label="Booking mode" options={OPTIONS} value="SELF" onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Booking mode' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Self-Drive' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Chauffeured' })).not.toBeChecked();
  });

  it('reports the chosen value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl label="Booking mode" options={OPTIONS} value="SELF" onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'Chauffeured' }));
    expect(onChange).toHaveBeenCalledWith('CHAUFFEURED');
  });

  it('can be a tab list instead, and copes with an empty "all" value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        kind="tab"
        label="Tier"
        options={[{ value: '', label: 'All' }, { value: 'EXECUTIVE', label: 'Executive' }]}
        value=""
        onChange={onChange}
      />
    );
    expect(screen.getByRole('tablist', { name: 'Tier' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'Executive' }));
    expect(onChange).toHaveBeenCalledWith('EXECUTIVE');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<SegmentedControl label="Booking mode" options={OPTIONS} value="SELF" onChange={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
