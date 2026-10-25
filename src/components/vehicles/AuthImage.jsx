import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { photoSrc } from '../../lib/vehiclePhotos';
import { useAuthStore } from '../../store/authStore';

/**
 * An `<img>` that shimmers (a light band sweeping across the photo panel — `.photo-shimmer` in index.css) until the
 * picture has arrived, then fades it in. A photo already in the browser's cache shows straight away.
 */
function ShimmerImg({ className = '', onLoad, onError, ...props }) {
  const ref = useRef(null);
  const [loaded, setLoaded] = useState(false);

  // A cached image can finish before React attaches onLoad — catch that too.
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) setLoaded(true);
  }, [props.src]);

  return (
    <img
      ref={ref}
      {...props}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      onError={onError}
      className={`${className} ${loaded ? 'photo-fade-in' : 'photo-shimmer'}`}
    />
  );
}

/**
 * An `<img>` for files the backend only serves to signed-in users (vehicle
 * photos answer 403 without a token, and an `<img src>` can't send one). When
 * signed in, the file is fetched with the login token and shown from a blob;
 * when signed out it falls back to a plain `src` (which the server may refuse —
 * `fallback` is shown if it does). Server-relative paths are resolved against
 * the API host. While a photo is on its way the space shimmers, and the photo
 * fades in when it arrives.
 *
 * @param {string} src
 * @param {string} alt
 * @param {React.ReactNode} [fallback] — shown while the image can't be loaded
 */
export default function AuthImage({ src, alt = '', fallback = null, ...imgProps }) {
  const url = photoSrc(src);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  // The picture couldn't be drawn — a missing file, or one that downloads but isn't a real image (e.g. an 8-byte
  // upload, seen live 2026-10-25): show the fallback instead of the browser's broken-image box and alt text.
  const [failed, setFailed] = useState(false);
  const onError = (e) => {
    setFailed(true);
    imgProps.onError?.(e);
  };

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
  if (/^(blob:|data:)/i.test(url)) return <ShimmerImg src={url} alt={alt} {...imgProps} />;

  if (isAuthenticated) {
    if (isError || failed) return fallback;
    if (blobUrl) return <ShimmerImg src={blobUrl} alt={alt} {...imgProps} onError={onError} />;
    return (
      <div
        role="img"
        aria-label={alt ? `Loading ${alt}` : 'Loading photo'}
        aria-busy="true"
        className={`${imgProps.className || ''} photo-shimmer`}
      />
    );
  }

  return failed ? fallback : <ShimmerImg src={url} alt={alt} {...imgProps} onError={onError} />;
}
