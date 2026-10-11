// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import RangeSlider from './RangeSlider';

const setup = (props = {}) => {
  const onCommit = vi.fn();
  render(<RangeSlider label="Price per day" min={0} max={20000} step={500} value={{ min: 2000, max: 15000 }} onCommit={onCommit} {...props} />);
  return {
    onCommit,
    min: screen.getByRole('slider', { name: /minimum price per day/i }),
    max: screen.getByRole('slider', { name: /maximum price per day/i }),
  };
};

describe('RangeSlider', () => {
  it('has a slider for each end, at the given values, with the range shown', () => {
    const { min, max } = setup({ format: (n) => `KES ${n}` });
    expect(min).toHaveValue('2000');
    expect(max).toHaveValue('15000');
    expect(screen.getByText('KES 2000 – KES 15000')).toBeInTheDocument();
    expect(min).toHaveAttribute('aria-valuetext', 'KES 2000');
  });

  it('follows the handle while it moves but only reports the range when it is let go', () => {
    const { min, onCommit } = setup({ format: (n) => `KES ${n}` });
    fireEvent.change(min, { target: { value: '5000' } });
    expect(screen.getByText('KES 5000 – KES 15000')).toBeInTheDocument();
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.pointerUp(min);
    expect(onCommit).toHaveBeenCalledWith({ min: 5000, max: 15000 });
  });

  it('also reports on a key release, so it works from the keyboard', () => {
    const { max, onCommit } = setup();
    fireEvent.change(max, { target: { value: '15500' } });
    fireEvent.keyUp(max, { key: 'ArrowRight' });
    expect(onCommit).toHaveBeenCalledWith({ min: 2000, max: 15500 });
  });

  it('never lets the handles cross or meet', () => {
    const { min, max } = setup();
    fireEvent.change(min, { target: { value: '19000' } });
    expect(Number(min.value)).toBeLessThan(15000);
    fireEvent.change(max, { target: { value: '100' } });
    expect(Number(max.value)).toBeGreaterThan(Number(min.value));
  });

  it('follows a new value from outside (e.g. Clear all)', () => {
    const onCommit = vi.fn();
    const { rerender } = render(<RangeSlider label="Price" min={0} max={20000} value={{ min: 2000, max: 15000 }} onCommit={onCommit} />);
    rerender(<RangeSlider label="Price" min={0} max={20000} value={{ min: 0, max: 20000 }} onCommit={onCommit} />);
    expect(screen.getByRole('slider', { name: /minimum price/i })).toHaveValue('0');
    expect(screen.getByRole('slider', { name: /maximum price/i })).toHaveValue('20000');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <RangeSlider label="Price per day" min={0} max={20000} value={{ min: 0, max: 20000 }} onCommit={() => {}} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
