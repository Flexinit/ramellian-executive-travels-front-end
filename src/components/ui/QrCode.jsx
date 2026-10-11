import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * A QR code for the given value, generated entirely client-side with the `qrcode` package — nothing is sent
 * to a third-party service to render it, which matters here since what it encodes (a booking link, a
 * reference number) can be sensitive. Renders as a plain `<img>` (a data URL), so it prints/saves-as-PDF
 * like any other image, unlike a `<canvas>` which some browsers skip when printing.
 *
 * @param {string} value — the text/URL to encode; renders nothing while empty
 * @param {number} [size] — the rendered image's width/height in px
 * @param {string} [className]
 */
export default function QrCode({ value, size = 112, className = '' }) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    if (!value) {
      setDataUrl(null);
      return undefined;
    }
    let cancelled = false;
    QRCode.toDataURL(value, { width: size * 2, margin: 1, color: { dark: '#16213E', light: '#FFFFFF' } })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) return null;

  return (
    <img
      src={dataUrl}
      alt="QR code"
      width={size}
      height={size}
      className={`rounded-lg bg-white p-1.5 ${className}`}
    />
  );
}
