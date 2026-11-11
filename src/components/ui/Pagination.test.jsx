// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from './Pagination';
import { usePagination, useServerPagination } from '../../hooks/usePagination';
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
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
    expect(screen.getByLabelText('Per page')).toHaveValue('50');
  });

  it('still shows the controls for a list that fits on one page, with Previous and Next disabled', () => {
    render(<List items={ITEMS.slice(0, 4)} />);
    expect(screen.getByText(/showing/i)).toHaveTextContent('Showing 1–4 of 4');
    expect(screen.getByLabelText('Per page')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
  });

  it('shows nothing for an empty list', () => {
    const { container } = render(<List items={[]} />);
    expect(container.querySelector('nav')).toBeNull();
  });
});

describe('useServerPagination — a list the backend pages', () => {
  function ServerList({ data, onRequest }) {
    const pager = useServerPagination(20);
    onRequest(pager.request);
    return <Pagination {...pager.propsFor(data)} noun="transactions" />;
  }

  it('asks for page 0 first, and turns a Spring Page into the same controls', async () => {
    const user = userEvent.setup();
    const requests = [];
    render(<ServerList data={{ totalElements: 95, totalPages: 5, number: 0 }} onRequest={(r) => requests.push(r)} />);
    expect(requests.at(-1)).toEqual({ page: 0, size: 20 });
    expect(screen.getByText(/showing/i)).toHaveTextContent('Showing 1–20 of 95 transactions');
    await user.click(screen.getByRole('button', { name: 'Go to page 5' }));
    expect(requests.at(-1)).toEqual({ page: 4, size: 20 });
    expect(screen.getByText(/showing/i)).toHaveTextContent('Showing 81–95 of 95 transactions');
    await user.selectOptions(screen.getByLabelText('Per page'), '50');
    expect(requests.at(-1)).toEqual({ page: 0, size: 50 });
  });
});
