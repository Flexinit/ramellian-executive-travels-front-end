import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';

/**
 * The audit trail — `AuditLogResponse` entries (`action`, `actorEmail`, `resourceType`, `resourceId`, `details`,
 * `ipAddress`, `status`, `createdAt`), from two sets of endpoints in the spec that answered identically for an
 * administrator when tested:
 *  - `scope: 'admin'` → `GET /admin/audit-logs` and `GET /admin/audit-logs/{id}` (the Audit Log page)
 *  - `scope: 'mine'`  → `GET /audit-logs` and `GET /audit-logs/{id}` (a person's own recent activity, on their Profile)
 * The list is a Spring page (`content`, `totalElements`, `totalPages`, `number`, `first`, `last`) taking `page`,
 * `size`, `sort` and the optional `action`, `actorEmail`, `resourceType` filters (matched loosely: `LOGIN` found
 * `AUTH_LOGIN`).
 */

const BASE = { admin: '/admin/audit-logs', mine: '/audit-logs' };

/**
 * @param {'admin'|'mine'} scope
 * @param {{ action?: string, actorEmail?: string, resourceType?: string, page?: number, size?: number }} [options]
 */
export function useAuditLogs(scope, { action, actorEmail, resourceType, page = 0, size = 20 } = {}) {
  const filters = { action: action || undefined, actorEmail: actorEmail || undefined, resourceType: resourceType || undefined };
  return useQuery({
    queryKey: ['audit-logs', scope, filters, page, size],
    queryFn: () => apiGet(BASE[scope], { ...filters, page, size, sort: 'createdAt,desc' }),
    placeholderData: keepPreviousData,
  });
}

/** One entry, fetched fresh by id. @param {'admin'|'mine'} scope @param {string|null} id */
export function useAuditLog(scope, id) {
  return useQuery({ queryKey: ['audit-logs', scope, 'one', id], queryFn: () => apiGet(`${BASE[scope]}/${id}`), enabled: !!id });
}

/**
 * The most recent sign-ins (`AUTH_LOGIN` entries, newest first, up to 200), refreshed every minute, for the
 * platform report's "signed in recently" — see `recentSignIns` in lib/platformStats.js for what it means.
 */
export function useRecentSignIns() {
  return useQuery({
    queryKey: ['audit-logs', 'admin', 'recent-sign-ins'],
    queryFn: () => apiGet(BASE.admin, { action: 'AUTH_LOGIN', page: 0, size: 200, sort: 'createdAt,desc' }),
    refetchInterval: 60 * 1000,
    select: (page) => (Array.isArray(page?.content) ? page.content : []),
  });
}
