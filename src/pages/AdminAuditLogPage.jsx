import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import AuditLogDetailModal from '../components/admin/AuditLogDetailModal';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { actionLabel, auditStatusVariant } from '../lib/auditLog';
import { SEARCH_DEBOUNCE_MS } from '../lib/constants';
import { formatDateTime } from '../lib/utils';

const PAGE_SIZE = 20;

/** The value, but only after it has stopped changing for a moment (so typing doesn't fire a request per key). */
function useDebounced(value) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return settled;
}

/**
 * Audit Log (`GET /admin/audit-logs`, `GET /admin/audit-logs/{id}`): who did what and when, newest first,
 * filterable by action, person and kind of record, a page at a time. A row opens the full entry.
 */
export default function AdminAuditLogPage() {
  const [action, setAction] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState(null);

  const filters = { action: useDebounced(action.trim()), actorEmail: useDebounced(actorEmail.trim()), resourceType: useDebounced(resourceType.trim()) };
  // A new filter starts again from the first page.
  useEffect(() => {
    setPage(0);
  }, [filters.action, filters.actorEmail, filters.resourceType]);

  const { data, isLoading, isError, refetch, isFetching } = useAuditLogs('admin', { ...filters, page, size: PAGE_SIZE });
  const entries = Array.isArray(data?.content) ? data.content : [];

  return (
    <PageWrapper>
      <PageTitle title="Audit Log" />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">Audit Log</h1>
          <p className="text-brand-grey text-sm mt-1">Who did what on the platform, newest first. Open an entry for its full details.</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Input label="Action" name="action" placeholder="e.g. LOGIN" value={action} onChange={(e) => setAction(e.target.value)} className="w-full sm:w-48" />
          <Input label="Person's email" name="actorEmail" type="search" placeholder="Email" value={actorEmail} onChange={(e) => setActorEmail(e.target.value)} className="w-full sm:w-64" />
          <Input label="Kind of record" name="resourceType" placeholder="e.g. USER" value={resourceType} onChange={(e) => setResourceType(e.target.value)} className="w-full sm:w-48" />
          {data && (
            <p className="text-brand-grey text-sm sm:ml-auto pb-2.5" aria-live="polite">
              {data.totalElements} {data.totalElements === 1 ? 'entry' : 'entries'}
            </p>
          )}
        </div>

        {isError && <ErrorBanner message="We couldn't load the audit log just now." onRetry={refetch} />}

        {isLoading ? (
          <div className="flex flex-col gap-2" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          !isError && <EmptyState icon={ScrollText} title="No entries found" description="Try different filters." />
        ) : (
          <div className={`table-scroll rounded-2xl border border-white/10 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            <table className="stack-table w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  {['When', 'Who', 'Action', 'About', 'Result'].map((col) => (
                    <th key={col} scope="col" className="px-4 py-3 text-xs font-semibold text-brand-grey uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {entries.map((entry) => {
                  const open = () => setOpenId(entry.id);
                  return (
                    <tr
                      key={entry.id}
                      tabIndex={0}
                      onClick={open}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') open();
                      }}
                      aria-label={`Open ${actionLabel(entry.action)} by ${entry.actorEmail || 'unknown'}`}
                      className="cursor-pointer hover:bg-white/5 transition-colors focus-ring"
                    >
                      <td data-label="When" className="stack-full px-4 py-3 text-sm text-brand-grey whitespace-nowrap">{formatDateTime(entry.createdAt)}</td>
                      <td data-label="Who" className="stack-full px-4 py-3 text-sm text-brand-white break-all">{entry.actorEmail || '—'}</td>
                      <td data-label="Action" className="px-4 py-3 text-sm text-brand-white">{actionLabel(entry.action)}</td>
                      <td data-label="About" className="px-4 py-3 text-sm text-brand-grey">{entry.resourceType || '—'}</td>
                      <td data-label="Result" className="px-4 py-3">
                        <Badge label={entry.status || '—'} variant={auditStatusVariant(entry.status)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <nav aria-label="Pages" className="flex items-center justify-between gap-3">
            <Button size="sm" disabled={data.first} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <ChevronLeft size={14} aria-hidden="true" />
              Newer
            </Button>
            <span className="text-sm text-brand-grey">
              Page {data.number + 1} of {data.totalPages}
            </span>
            <Button size="sm" disabled={data.last} onClick={() => setPage((p) => p + 1)}>
              Older
              <ChevronRight size={14} aria-hidden="true" />
            </Button>
          </nav>
        )}
      </div>

      <AuditLogDetailModal scope="admin" id={openId} onClose={() => setOpenId(null)} />
    </PageWrapper>
  );
}
