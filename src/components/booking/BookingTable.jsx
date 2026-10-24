import React from 'react';
import { FileText } from 'lucide-react';
import BookingRow from './BookingRow';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import Pagination from '../ui/Pagination';
import { usePagination } from '../../hooks/usePagination';

const BASE_COLUMNS = ['Vehicle', 'Dates', 'Status', 'Cost'];
const PAGE_SIZE = 10;

/**
 * @param {object[]} bookings
 * @param {boolean} isLoading
 * @param {string} basePath — row detail route prefix, e.g. "/owner/bookings"
 * @param {string} actionLabel — e.g. "Assign" — adds a trailing action column when set together with onAction
 * @param {function} onAction
 * @param {any} [resetKey] — when it changes (a filter) the table goes back to page 1
 * @param {boolean} [showContract] — adds a trailing Contract column (see BookingRow) — My Bookings only
 * @param {boolean} [showReceipt] — adds a trailing Receipt column (see BookingRow)
 */
export default function BookingTable({ bookings, isLoading, basePath, actionLabel, onAction, resetKey, showContract = false, showReceipt = false }) {
  const pages = usePagination(bookings || [], PAGE_SIZE, resetKey);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No bookings yet"
        description="Once a booking comes in, it will show up here."
      />
    );
  }

  const columns = [
    ...BASE_COLUMNS,
    ...(showContract ? ['Contract'] : []),
    ...(showReceipt ? ['Receipt'] : []),
    ...(onAction ? ['Chauffeur'] : []),
    '',
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card className="table-scroll">
        <table className="stack-table w-full text-left">
          <thead>
            <tr className="border-b border-ink/10">
              {columns.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className={`px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider ${
                    col === 'Cost' || col === 'Chauffeur' || col === 'Contract' || col === 'Receipt' ? 'text-right' : ''
                  }`}
                >
                  {col === '' ? <span className="sr-only">Details</span> : col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {pages.pageItems.map((b) => (
              <BookingRow key={b.id} booking={b} basePath={basePath} actionLabel={actionLabel} onAction={onAction} showContract={showContract} showReceipt={showReceipt} />
            ))}
          </tbody>
        </table>
      </Card>
      <Pagination page={pages.page} totalPages={pages.totalPages} onPage={pages.setPage} from={pages.from} to={pages.to} total={pages.total} noun="bookings" />
    </div>
  );
}
