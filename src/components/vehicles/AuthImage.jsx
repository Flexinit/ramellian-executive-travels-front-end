import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { photoSrc } from '../../lib/vehiclePhotos';
import { useAuthStore } from '../../store/authStore';

/**
 * An `<img>` for files the backend only serves to signed-in users (vehicle
 * photos answer 403 without a token, and an `<img src>` can't send one). When
 * signed in, the file is fetched with the login token and shown from a blob;
 * when signed out it falls back to a plain `src` (which the server may refuse —
 * `fallback` is shown if it does). Server-relative paths are resolved against
 * the API host.
 *
 * @param {string} src
 * @param {string} alt
 * @param {React.ReactNode} [fallback] — shown while the image can't be loaded
 */
export default function AuthImage({ src, alt = '', fallback = null, ...imgProps }) {
  const url = photoSrc(src);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [plainFailed, setPlainFailed] = useState(false);

  const { data: blobUrl, isError } = useQuery({
    queryKey: ['vehicle-photo', url],
    queryFn: async () => {
      const response = await api.get(url, { responseType: 'blob' });
      return URL.createObjectURL(response.data);
    },
    enabled: isAuthenticated && !!url && !/^(blob:|data:)/i.test(url),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  if (!url) return fallback;

  // Already a local URL — nothing to fetch.
  if (/^(blob:|data:)/i.test(url)) return <img src={url} alt={alt} {...imgProps} />;

  if (isAuthenticated) {
    if (blobUrl) return <img src={blobUrl} alt={alt} {...imgProps} />;
    if (isError) return fallback;
    return <div role="img" aria-label={alt ? `Loading ${alt}` : 'Loading photo'} aria-busy="true" className={`${imgProps.className || ''} animate-pulse bg-black/5`} />;
  }

  return plainFailed ? fallback : <img src={url} alt={alt} onError={() => setPlainFailed(true)} {...imgProps} />;
}
