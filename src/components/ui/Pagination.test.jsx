// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from './Pagination';
import { usePagination } from '../../hooks/usePagination';
import { pageSizeOptions } from './PageSizeSelect';

const ITEMS = Array.from({ length: 30 }, (_, i) => `Item ${i + 1}`);

function List({ items = ITEMS, size = 5 }) {
  const pages = usePagination(items, size);
  return (
    <>
      <ul aria-label="Items">{pages.pageItems.map((t) => <li key={t}>{t}</li>)}</ul>
      <Pagination page={pages.page} totalPages={pages.totalPages} onPage={pages.setPage} from={pages.from} to={pages.to} total={pages.total} pageSize={pages.pageSize} onPageSize={pages.setPageSize} defaultPageSize={pages.defaultPageSize} />
    </>
  );
}

describe('Pagination — how many per page', () => {
  it('offers the list’s own default alongside 10, 25, 50 and 100', () => {
    expect(pageSizeOptions(5)).toEqual([5, 10, 25, 50, 100]);
    expect(pageSizeOptions(10)).toEqual([10, 25, 50, 100]);
  });

  it('changes how many items each page shows, back on page 1', async () => {
    const user = userEvent.setup();
    render(<List />);
    expect(within(screen.getByRole('list', { name: 'Items' })).getAllByRole('listitem')).toHaveLength(5);

    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
    expect(screen.getByText('Item 6')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Per page'), '25');
    expect(within(screen.getByRole('list', { name: 'Items' })).getAllByRole('listitem')).toHaveLength(25);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText(/showing/i)).toHaveTextContent('Showing 1–25 of 30');
  });

  it('keeps the Per page choice when everything fits on one page after choosing a bigger size', async () => {
    const user = userEvent.setup();
    render(<List />);
    await user.selectOptions(screen.getByLabelText('Per page'), '50');
    expect(screen.queryByRole('button', { name: /next page/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Per page')).toHaveValue('50');
  });

  it('shows nothing for a list shorter than the smallest size', () => {
    const { container } = render(<List items={ITEMS.slice(0, 4)} />);
    expect(container.querySelector('nav')).toBeNull();
  });
});
