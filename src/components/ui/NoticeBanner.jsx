import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Info, X } from 'lucide-react';

const TONES = {
  success: { icon: CheckCircle2, box: 'border-green-500/30 bg-green-500/10', icon_: 'text-green-600', title: 'text-green-800 dark:text-green-300' },
  danger: { icon: AlertTriangle, box: 'border-red-500/30 bg-red-500/10', icon_: 'text-red-600', title: 'text-red-700 dark:text-red-300' },
  warning: { icon: Clock, box: 'border-amber-500/30 bg-amber-500/10', icon_: 'text-amber-600', title: 'text-amber-800 dark:text-amber-300' },
  info: { icon: Info, box: 'border-accent/30 bg-accent/10', icon_: 'text-accent', title: 'text-ink' },
};

/**
 * A result that stays on screen until it's dismissed — for outcomes that matter too much for a toast that fades in a
 * few seconds (e.g. what happened to a payout). Same shape as `ErrorBanner`, in four tones.
 *
 * @param {'success'|'danger'|'warning'|'info'} [tone='info']
 * @param {string} title — the outcome, in a few words
 * @param {React.ReactNode} [children] — the detail
 * @param {string} [meta] — small print, e.g. when it happened
 * @param {React.ReactNode} [aside] — shown on the right, e.g. a countdown
 * @param {function} [onDismiss] — shows a close (×) button
 */
export default function NoticeBanner({ tone = 'info', title, children, meta, aside, onDismiss }) {
  const t = TONES[tone] || TONES.info;
  const Icon = t.icon;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${t.box}`}>
      <Icon size={18} className={`${t.icon_} mt-0.5 shrink-0`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${t.title}`}>{title}</p>
        {children && <div className="text-sm text-ink mt-0.5 break-words">{children}</div>}
        {meta && <p className="text-xs text-muted mt-1">{meta}</p>}
      </div>
      {aside && <div className="shrink-0 self-center">{aside}</div>}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 -m-1 p-1 rounded-lg text-muted hover:text-ink hover:bg-ink/5 focus-ring"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
