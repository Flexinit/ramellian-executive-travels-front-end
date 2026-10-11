import React, { useState, useEffect, useRef } from 'react';
import { Timer } from 'lucide-react';

/**
 * Booking expiry countdown timer.
 * Shows MM:SS, turns red under 2 minutes, calls onExpired at zero.
 *
 * @param {number} expiresAt — Unix timestamp in ms
 * @param {function} onExpired — called once when timer hits 00:00
 */
export default function CountdownTimer({ expiresAt, onExpired }) {
  const getRemaining = () => Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  const [seconds, setSeconds] = useState(getRemaining);
  const expiredCalled = useRef(false);

  useEffect(() => {
    expiredCalled.current = false;
    setSeconds(getRemaining());

    const id = setInterval(() => {
      const remaining = getRemaining();
      setSeconds(remaining);
      if (remaining === 0 && !expiredCalled.current) {
        expiredCalled.current = true;
        onExpired?.();
        clearInterval(id);
      }
    }, 1000);

    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  const isUrgent = seconds < 120;

  return (
    <div className={`inline-flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums ${isUrgent ? 'text-red-400' : 'text-brand-gold'}`}>
      <Timer size={14} className={isUrgent ? 'text-red-400' : 'text-brand-gold'} />
      {mins}:{secs}
    </div>
  );
}
