import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPut } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { useAuthStore } from '../store/authStore';

/**
 * Platform-wide settings — `platform-settings-controller` (docs/backend-requests.md item 26). Confirmed
 * against the live spec 2026-10-25: `GET`/`PUT /platform-settings` (it was `/platform-settings/commission`
 * until then), `PlatformSettingsResponse` is `{ id, commissionRatePct, pesapalTransactionFeeRatePct,
 * deliveryFlatFee, driverFlatCharge, botAssistantEnabled, multiDayCommissionRatePct, multiDayThresholdDays }` (the
 * last two added 2026-10-26) and `PlatformSettingsRequest` takes the same
 * (`commissionRatePct` required, the two rates 0–100, the two fees ≥ 0). `PUT /platform-settings/bot`
 * (`BotAssistantToggleRequest { enabled }`, required) switches only the assistant. `GET` needs auth and was
 * readable by any signed-in role when last probed; `PUT` refuses a non-admin token (403).
 *
 * The `PUT` replaces the settings as a whole, so a save always sends every field — sending only the one that
 * changed could clear the others.
 */

const KEY = ['platform-settings'];

/** The current platform settings (`PlatformSettingsResponse`). */
export function usePlatformSettings({ enabled = true } = {}) {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiGet('/platform-settings'),
    enabled,
  });
}

/** Kept for existing callers: the same query, read for its commission rate. */
export const usePlatformCommission = usePlatformSettings;

/**
 * Saves the platform settings (admin only). Pass all of them: `{ commissionRatePct, multiDayCommissionRatePct,
 * multiDayThresholdDays, pesapalTransactionFeeRatePct, deliveryFlatFee, driverFlatCharge, botAssistantEnabled }`.
 */
export function useSavePlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => apiPut('/platform-settings', payload),
    onSuccess: (updated) => {
      if (updated) queryClient.setQueryData(KEY, updated);
      // Quotes include the commission, the transaction fee, the delivery fee and the driver charge: re-price
      // anything open.
      queryClient.invalidateQueries({ queryKey: ['booking-quote'] });
      toast.success('Platform settings saved.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't save the platform settings.")),
  });
}

/** Kept for existing callers. */
export const useSetPlatformCommission = useSavePlatformSettings;

/** Turns the in-app assistant on or off for everyone (admin only) — `PUT /platform-settings/bot`. */
export function useToggleBotAssistant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled) => apiPut('/platform-settings/bot', { enabled }),
    onSuccess: (updated, enabled) => {
      if (updated) queryClient.setQueryData(KEY, updated);
      toast.success(enabled ? 'The assistant is on.' : 'The assistant is off.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't change the assistant setting.")),
  });
}

/**
 * Whether to offer the in-app assistant. Only a signed-in person can read the settings, so a visitor always
 * sees the chat button (it asks them to log in). Signed in, it's hidden only once the settings say
 * `botAssistantEnabled: false` — while loading, on an error, or when the field is missing it stays on.
 */
export function useBotAssistantEnabled() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const { data } = usePlatformSettings({ enabled: isAuthenticated });
  return !isAuthenticated || data?.botAssistantEnabled !== false;
}
