import React, { useState } from 'react';
import { Smartphone } from 'lucide-react';

/** M-Pesa's own logo (public/payments/mpesa.jpg — the product owner's image, cropped to the wordmark). */
export const MPESA_LOGO_SRC = '/payments/mpesa.jpg';

/**
 * M-Pesa's logo wherever paying by M-Pesa is offered — the payment choice, its buttons, the "check your phone" panel.
 * Sized by height (`size`, as an icon would be); falls back to a phone icon in M-Pesa green if the image can't load.
 *
 * @param {number} [size] — height in px
 * @param {string} [className]
 */
export default function MpesaLogo({ size = 16, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Smartphone size={size} className={`text-mpesa-deep ${className}`} aria-hidden="true" />;
  return (
    <img
      src={MPESA_LOGO_SRC}
      alt=""
      aria-hidden="true"
      onError={() => setFailed(true)}
      style={{ height: size, width: 'auto' }}
      className={`inline-block rounded-sm object-contain ${className}`}
    />
  );
}
