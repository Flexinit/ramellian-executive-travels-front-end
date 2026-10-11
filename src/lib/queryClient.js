import { QueryClient } from '@tanstack/react-query';
import { QUERY_STALE_TIME, QUERY_GC_TIME } from './constants';

/**
 * Shared TanStack QueryClient instance.
 * Import this in main.jsx and in tests via a reset helper.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME,
      gcTime: QUERY_GC_TIME,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
