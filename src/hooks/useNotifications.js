import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut } from '../lib/api';
import { useAuthStore } from '../store/authStore';

/**
 * The backend's notifications (see the live OpenAPI spec): `GET /notifications`,
 * `GET /notifications/unread-count` (`{ unreadCount }`), `PUT /notifications/{id}/read` and
 * `PUT /notifications/read-all`. The backend creates them — an owner gets one when a renter
 * books their vehicle — so the portal only reads them and marks them read. Polled every 30s.
 */

const POLL_MS = 30_000;
const KEY = ['notifications'];
const COUNT_KEY = ['notifications', 'unread-count'];

/** The number on the bell. */
export function useUnreadNotificationCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return useQuery({
    queryKey: COUNT_KEY,
    queryFn: () => apiGet('/notifications/unread-count'),
    select: (data) => Number(data?.unreadCount ?? 0),
    enabled: isAuthenticated,
    refetchInterval: POLL_MS,
  });
}

/** The signed-in person's notifications, newest first. */
export function useNotificationList() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return useQuery({
    queryKey: [...KEY, 'list'],
    queryFn: () => apiGet('/notifications'),
    select: (data) =>
      (Array.isArray(data) ? [...data] : []).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))),
    enabled: isAuthenticated,
    refetchInterval: POLL_MS,
  });
}

/** Flips `read` on cached notifications immediately, so the list and the bell respond before the server does. */
function markCachedRead(queryClient, ids) {
  let flipped = 0;
  queryClient.setQueriesData({ queryKey: [...KEY, 'list'] }, (list) => {
    if (!Array.isArray(list)) return list;
    return list.map((n) => {
      if (n.read || (ids && !ids.includes(n.id))) return n;
      flipped += 1;
      return { ...n, read: true };
    });
  });
  queryClient.setQueryData(COUNT_KEY, (data) => ({ ...(data || {}), unreadCount: Math.max(0, Number(data?.unreadCount ?? 0) - flipped) }));
}

/** Marks one notification read (`PUT /notifications/{id}/read`). */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiPut(`/notifications/${id}/read`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      markCachedRead(queryClient, [id]);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

/** Marks every notification read (`PUT /notifications/read-all`). */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiPut('/notifications/read-all'),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: KEY });
      markCachedRead(queryClient, null);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
