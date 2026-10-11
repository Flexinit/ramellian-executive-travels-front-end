import { useQuery } from '@tanstack/react-query';
import { scanSticker } from '../lib/qrScan';

/**
 * Reads the QR code on an insurance sticker photo once and remembers the answer (`data` is the QR's text, or
 * null when no QR could be read). A failure to fetch or decode the photo counts as "no QR found" rather than an error.
 * @param {string|null} src
 */
export function useStickerScan(src) {
  return useQuery({
    queryKey: ['sticker-qr', src],
    queryFn: () => scanSticker(src).catch(() => null),
    enabled: !!src,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
}
