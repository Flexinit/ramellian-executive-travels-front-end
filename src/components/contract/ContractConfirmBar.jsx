import React from 'react';
import Checkbox from '../ui/Checkbox';
import Button from '../ui/Button';

/**
 * Stays at the bottom of the screen while the contract is read: "I have read and understood this agreement",
 * and the next step's button, which only works once that's ticked — so nobody accepts or signs without
 * confirming they've read it.
 *
 * @param {boolean} confirmed
 * @param {function} onConfirmedChange — gets the new value
 * @param {React.ReactNode} children — the action button's content
 * @param {function} onAction
 * @param {boolean} [loading]
 * @param {boolean} [disabled] — kept off for another reason (on top of not confirmed yet)
 */
export default function ContractConfirmBar({ confirmed, onConfirmedChange, children, onAction, loading = false, disabled = false }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 sm:mx-0 print:hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t sm:border border-white/15 sm:rounded-2xl bg-brand-navy/95 backdrop-blur px-4 py-3 shadow-2xl shadow-black/40">
        <Checkbox
          checked={confirmed}
          onChange={(e) => onConfirmedChange(e.target.checked)}
          label={<span className="text-brand-white">I have read and understood this agreement, and the details in it are correct.</span>}
        />
        <Button size="lg" onClick={onAction} loading={loading} disabled={!confirmed || disabled} className="shrink-0">
          {children}
        </Button>
      </div>
    </div>
  );
}
