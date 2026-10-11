// @vitest-environment jsdom
import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DateRangePicker, { DEFAULT_START_TIME, DEFAULT_END_TIME } from './DateRangePicker';

const EMPTY = { startDate: null, endDate: null, startTime: DEFAULT_START_TIME, endTime: DEFAULT_END_TIME };

/** A thin stateful wrapper so clicking a day actually re-renders with the new value, like a real caller. */
function Controlled({ initial = EMPTY, disabledRanges, onChange }) {
  const [value, setValue] = useState(initial);
  return (
    <DateRangePicker
      value={value}
      disabledRanges={disabledRanges}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

async function open(user) {
  await user.click(screen.getByRole('button', { name: /add trip dates|select return date|–/i }));
}

describe('DateRangePicker — guides which endpoint comes next', () => {
  it('prompts for the start date, then the return date, then offers to start over once both are picked', async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await open(user);
    expect(screen.getByText('Select your start date')).toBeInTheDocument();

    const enabledDays = screen.getAllByRole('button').filter((b) => /^\d+$/.test(b.textContent) && !b.disabled);
    await user.click(enabledDays[0]);
    expect(screen.getByText('Now select your return date')).toBeInTheDocument();

    const stillEnabled = screen.getAllByRole('button').filter((b) => /^\d+$/.test(b.textContent) && !b.disabled);
    await user.click(stillEnabled[stillEnabled.length - 1]);
    expect(screen.getByText(/pick a new day to start over/i)).toBeInTheDocument();
  });
});

describe('DateRangePicker — disabledRanges', () => {
  it('refuses a disabled day as the start date', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    // A wide range covering "today" through the end of the visible month, so this test isn't sensitive to
    // which day "today" happens to be when it runs.
    const today = new Date();
    const disabledRanges = [{ start: today, end: new Date(today.getFullYear(), today.getMonth() + 1, 0) }];
    render(<Controlled disabledRanges={disabledRanges} onChange={onChange} />);

    await open(user);
    // Every selectable (non-past) day this month is disabled — there should be nothing left to click that
    // isn't either a past day or a struck-through disabled one.
    const enabledDays = screen.getAllByRole('button').filter((b) => /^\d+$/.test(b.textContent) && !b.disabled);
    expect(enabledDays).toHaveLength(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('lets an unaffected day still be picked as the start date', async () => {
    const user = userEvent.setup();
    const farFuture = { start: new Date(2099, 0, 1), end: new Date(2099, 0, 5) };
    render(<Controlled disabledRanges={[farFuture]} />);

    await open(user);
    const enabledDays = screen.getAllByRole('button').filter((b) => /^\d+$/.test(b.textContent) && !b.disabled);
    // Today's own date cell (or some day this month) is still pickable, since the disabled range is in 2099.
    expect(enabledDays.length).toBeGreaterThan(0);
  });

  it('refuses an end date whose range would span across a disabled day in between', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    // Day 15 of next month is disabled — a range from day 10 to day 20 of that month would cross it.
    const d = new Date();
    const targetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const day15 = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 15);
    render(<Controlled disabledRanges={[{ start: day15, end: day15 }]} onChange={onChange} />);

    await open(user);
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    await user.click(screen.getByText('10'));
    onChange.mockClear();
    await user.click(screen.getByText('20'));

    // The click on day 20 should be refused (range crosses day 15) — onChange never fires for it, so the
    // picker is still waiting on a return date rather than having accepted 10–20.
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /select return date/i })).toBeInTheDocument();
  });
});
