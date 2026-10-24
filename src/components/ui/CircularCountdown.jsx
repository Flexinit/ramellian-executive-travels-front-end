import React, { useEffect, useRef, useState } from 'react';

const SIZE = 112;
const STROKE = 7;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A round countdown clock: a ring that drains as time runs out, with the
 * seconds left in the middle. Turns red for the last 10 seconds and calls
 * `onExpire` once at zero.
 *
 * @param {number} startedAt — ms timestamp the countdown began
 * @param {number} [durationSeconds=60]
 * @param {function} [onExpire]
 * @param {string} [label] — accessible description, e.g. "left to enter your code"
 */
export default function CircularCountdown({ startedAt, durationSeconds = 60, onExpire, label = 'left' }) {
  const endsAt = startedAt + durationSeconds * 1000;
  const remainingNow = () => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  const [remaining, setRemaining] = useState(remainingNow);
  const expired = useRef(false);

  useEffect(() => {
    expired.current = false;
    setRemaining(remainingNow());
    const tick = () => {
      const left = remainingNow();
      setRemaining(left);
      if (left === 0 && !expired.current) {
        expired.current = true;
        onExpire?.();
        clearInterval(id);
      }
    };
    const id = setInterval(tick, 250);
    tick();
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, durationSeconds]);

  const fraction = Math.min(1, Math.max(0, remaining / durationSeconds));
  const urgent = remaining <= 10;

  return (
    <div
      role="timer"
      aria-label={`${remaining} seconds ${label}`}
      className="relative inline-flex items-center justify-center"
      style={{ width: SIZE, height: SIZE }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" aria-hidden="true">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="currentColor" strokeWidth={STROKE} className="text-black/10" />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          className={`${urgent ? 'text-red-600' : 'text-accent'} transition-[stroke-dashoffset] duration-300 ease-linear motion-reduce:transition-none`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className={`font-heading text-3xl font-bold tabular-nums ${urgent ? 'text-red-600' : 'text-ink'}`}>{remaining}</span>
        <span className="text-xs text-muted -mt-0.5">sec</span>
      </div>
    </div>
  );
}
