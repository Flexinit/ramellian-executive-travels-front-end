import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPut } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { useAuthStore } from '../store/authStore';
import { socialLink, whatsappLink } from '../seo/seoConfig';

export { socialLink, whatsappLink };

/**
 * Platform-wide settings — `platform-settings-controller` (docs/backend-requests.md items 26, 48). `GET`/`PUT
 * /platform-settings`; `PlatformSettingsResponse` (live spec 2026-10-26) carries:
 *  - pricing: `commissionRatePct` (required on PUT), `multiDayCommissionRatePct`, `multiDayThresholdDays`,
 *    `pesapalTransactionFeeRatePct`, `deliveryFlatFee`, `driverFlatCharge`;
 *  - the assistant switch: `botAssistantEnabled` (also `PUT /platform-settings/bot` `{ enabled }`, and the public
 *    `GET /bot/status` → `{ enabled }`);
 *  - pickup reminders the backend sends: `pickupReminderEnabled`, `pickupReminderRenterEnabled`,
 *    `pickupReminderOwnerEnabled`, `pickupReminderLeadMinutes`;
 *  - the business's public contact details: `supportEmail`, `supportPhone`, `address`, `website`, `facebook`,
 *    `instagram`, `whatsapp`, `xTwitter`, `tiktok`.
 *
 * `GET` is readable without a login on the office backend since 2026-10-26 (the Contact page and footer use it);
 * `PUT` is admin only. The `PUT` replaces the settings as a whole, so every save is merged onto the current settings
 * here — a tab saving only its own fields can never clear another tab's.
 */

const KEY = ['platform-settings'];
const BOT_KEY = ['bot-status'];

/** The current platform settings (`PlatformSettingsResponse`). */
export function usePlatformSettings({ enabled = true } = {}) {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiGet('/platform-settings'),
    enabled,
    staleTime: 60 * 1000,
  });
}

/** Kept for existing callers: the same query, read for its commission rate. */
export const usePlatformCommission = usePlatformSettings;

/**
 * Saves some of the platform settings (admin only): `changes` is merged onto the settings as they are now, so the
 * `PUT` (which replaces everything) keeps whatever this save doesn't touch.
 */
export function useSavePlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (changes) => {
      const current = queryClient.getQueryData(KEY) ?? (await apiGet('/platform-settings'));
      const { id: _id, ...rest } = current || {};
      return apiPut('/platform-settings', { ...rest, ...changes });
    },
    onSuccess: (updated) => {
      if (updated) queryClient.setQueryData(KEY, updated);
      // Quotes include the commission, the transaction fee, the delivery fee and the driver charge: re-price
      // anything open. The contact details show on public pages.
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
      queryClient.setQueryData(BOT_KEY, { enabled });
      toast.success(enabled ? 'The assistant is on.' : 'The assistant is off.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't change the assistant setting.")),
  });
}

/** Whether the assistant is on — `GET /bot/status` (public, live spec 2026-10-26) → `{ enabled }`. */
export function useBotStatus() {
  return useQuery({ queryKey: BOT_KEY, queryFn: () => apiGet('/bot/status'), staleTime: 60 * 1000, retry: false });
}

/**
 * Whether to offer the in-app assistant (the green chat button, the top-bar icon, the menu item, the page) —
 * `{ enabled, loading }`, for visitors and signed-in people alike, from the public `GET /bot/status`.
 *
 * While it loads, `enabled` is true (the menu item and top-bar icon stay put) and `loading` says so — the floating chat
 * button waits for it, so it never flashes up and vanishes when the assistant is off. If the status can't be read (a
 * backend that doesn't have it yet answers 401), a signed-in person falls back to the settings' `botAssistantEnabled`,
 * and a visitor gets the button (it asks them to log in to chat).
 */
export function useBotAssistantStatus() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const status = useBotStatus();
  const fallback = status.isError && isAuthenticated;
  const settings = usePlatformSettings({ enabled: fallback });

  if (typeof status.data?.enabled === 'boolean') return { enabled: status.data.enabled, loading: false };
  if (status.isLoading || (fallback && settings.isLoading)) return { enabled: true, loading: true };
  if (fallback && typeof settings.data?.botAssistantEnabled === 'boolean') return { enabled: settings.data.botAssistantEnabled, loading: false };
  return { enabled: true, loading: false };
}

/** @see useBotAssistantStatus — just whether to show it. */
export function useBotAssistantEnabled() {
  return useBotAssistantStatus().enabled;
}

/** Links to the business's social profiles, in display order — label, settings field, and how to build the address. */
export const SOCIAL_FIELDS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'xTwitter', label: 'X (Twitter)' },
  { key: 'tiktok', label: 'TikTok' },
];

/**
 * The business's public contact details from the settings — only what an administrator has filled in (never a
 * placeholder): `{ email, phone, whatsapp, address, website, socials: [{ key, label, href }], isLoading }`.
 */
export function useContactDetails() {
  const { data, isLoading } = usePlatformSettings();
  const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    isLoading,
    email: clean(data?.supportEmail),
    phone: clean(data?.supportPhone),
    whatsapp: whatsappLink(data?.whatsapp),
    address: clean(data?.address),
    website: clean(data?.website),
    socials: SOCIAL_FIELDS.map((s) => ({ ...s, href: socialLink(s.key, data?.[s.key]) })).filter((s) => s.href),
  };
}
