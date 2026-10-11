import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPut } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';

/**
 * Platform-wide settings — `platform-settings-controller` (docs/backend-requests.md item 26). Confirmed
 * against the live spec 2026-10-09, `PlatformSettingsResponse` is `{ id, commissionRatePct,
 * pesapalTransactionFeeRatePct, deliveryFlatFee }` and `PlatformSettingsRequest` takes the same three
 * (`commissionRatePct` required, all ≥ 0). `GET /platform-settings/commission` needs auth but is readable by
 * any signed-in role; `PUT` refuses a non-admin token (403), so only the admin settings page changes them.
 *
 * The `PUT` replaces the settings as a whole, so a save always sends all three — sending only the one that
 * changed could clear the others.
 */

const KEY = ['platform-settings', 'commission'];

/** The current platform settings (`PlatformSettingsResponse`). */
export function usePlatformSettings() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiGet('/platform-settings/commission'),
  });
}

/** Kept for existing callers: the same query, read for its commission rate. */
export const usePlatformCommission = usePlatformSettings;

/**
 * Saves the platform settings (admin only). Pass all three:
 * `{ commissionRatePct, pesapalTransactionFeeRatePct, deliveryFlatFee }`.
 */
export function useSavePlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => apiPut('/platform-settings/commission', payload),
    onSuccess: (updated) => {
      if (updated) queryClient.setQueryData(KEY, updated);
      // Quotes include the commission, the transaction fee and the delivery fee: re-price anything open.
      queryClient.invalidateQueries({ queryKey: ['booking-quote'] });
      toast.success('Platform settings saved.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't save the platform settings.")),
  });
}

/** Kept for existing callers. */
export const useSetPlatformCommission = useSavePlatformSettings;
