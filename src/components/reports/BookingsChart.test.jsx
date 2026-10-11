// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingsChart from './BookingsChart';

const REPORT = {
  upcoming: [{ id: 'a', startTime: '2026-08-05T09:00:00Z' }],
  completed: [
    { id: 'b', startTime: '2026-07-10T09:00:00Z' },
    { id: 'c', startTime: '2026-07-20T09:00:00Z' },
  ],
  cancelled: [{ id: 'd', startTime: '2026-08-15T09:00:00Z' }],
  active: [],
  rejected: [],
};

describe('BookingsChart', () => {
  it('shows an empty state when the report has no bookings', () => {
    render(<BookingsChart report={{}} />);
    expect(screen.getByText(/no bookings to chart yet/i)).toBeInTheDocument();
  });

  it('renders the chart with a legend for every outcome, and the day/week/month grouping control', () => {
    render(<BookingsChart report={REPORT} />);
    expect(screen.getByRole('img', { name: /bookings over time/i })).toBeInTheDocument();
    const legend = screen.getByRole('list', { name: /outcome/i });
    ['Upcoming', 'Active', 'Completed', 'Cancelled', 'Rejected'].forEach((label) => {
      expect(within(legend).getByText(label)).toBeInTheDocument();
    });
    const grouping = screen.getByRole('radiogroup', { name: /group bookings by/i });
    expect(within(grouping).getByRole('radio', { name: 'Month', checked: true })).toBeInTheDocument();
  });

  it('table view shows the monthly breakdown as an accessible table (the default grouping)', async () => {
    const user = userEvent.setup();
    render(<BookingsChart report={REPORT} />);

    await user.click(screen.getByRole('button', { name: 'Table view' }));
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Month' })).toBeInTheDocument();
    const julRow = within(table).getByText('Jul 2026').closest('tr');
    const cells = within(julRow).getAllByRole('cell');
    expect(cells.map((c) => c.textContent)).toEqual(['Jul 2026', '0', '0', '2', '0', '0', '2']);
  });

  it('switching the grouping to Day changes the table to one row per day', async () => {
    const user = userEvent.setup();
    render(<BookingsChart report={REPORT} />);

    await user.click(screen.getByRole('radio', { name: 'Day' }));
    await user.click(screen.getByRole('button', { name: 'Table view' }));
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Day' })).toBeInTheDocument();
    expect(within(table).getByText('Jul 10')).toBeInTheDocument();
    expect(within(table).getByText('Jul 20')).toBeInTheDocument();
    expect(within(table).queryByText('Jul 2026')).not.toBeInTheDocument();
  });

  it('switching the grouping to Week changes the table to one row per week', async () => {
    const user = userEvent.setup();
    render(<BookingsChart report={REPORT} />);

    await user.click(screen.getByRole('radio', { name: 'Week' }));
    await user.click(screen.getByRole('button', { name: 'Table view' }));
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Week' })).toBeInTheDocument();
    expect(within(table).getAllByText(/^Week of /).length).toBeGreaterThan(0);
  });
});
