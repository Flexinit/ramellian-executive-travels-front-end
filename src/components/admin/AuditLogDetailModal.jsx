import React from 'react';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { useAuditLog } from '../../hooks/useAuditLogs';
import { actionLabel, auditStatusVariant } from '../../lib/auditLog';
import { formatDateTime } from '../../lib/utils';

const rows = (entry) =>
  [
    ['When', formatDateTime(entry.createdAt)],
    ['Who', entry.actorEmail],
    ['Role', entry.actorRole],
    ['Action', entry.action],
    ['About', [entry.resourceType, entry.resourceId].filter(Boolean).join(' · ')],
    ['Details', entry.details],
    ['IP address', entry.ipAddress],
    ['Entry ID', entry.id],
  ].filter(([, value]) => value);

/**
 * One audit-log entry, fetched by id (`GET /admin/audit-logs/{id}` for an administrator, `GET /audit-logs/{id}`
 * for a person's own activity). Open while `id` is set.
 *
 * @param {'admin'|'mine'} scope
 * @param {string|null} id
 * @param {function} onClose
 */
export default function AuditLogDetailModal({ scope, id, onClose }) {
  const { data: entry, isLoading, isError } = useAuditLog(scope, id);

  return (
    <Modal isOpen={!!id} onClose={onClose} title={entry ? actionLabel(entry.action) : 'Activity'} size="md">
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner size="lg" label="Loading entry" />
        </div>
      )}
      {isError && <p className="text-sm text-red-400">Couldn&apos;t load this entry.</p>}
      {entry && (
        <div className="flex flex-col gap-4">
          <Badge label={entry.status || 'Unknown'} variant={auditStatusVariant(entry.status)} className="self-start" />
          <dl className="flex flex-col gap-3">
            {rows(entry).map(([label, value]) => (
              <div key={label} className="flex gap-4 text-sm">
                <dt className="text-brand-grey w-24 shrink-0">{label}</dt>
                <dd className="text-brand-white min-w-0 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Modal>
  );
}
