import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import Input from '../ui/Input';
import Checkbox from '../ui/Checkbox';
import Button from '../ui/Button';

const NUMBER_FIELDS = ['freeCancellationWindowHours', 'cancellationDeadlineHours', 'lateCancellationRefundPct', 'postponementDeadlineHours', 'maxPostponements'];

const EMPTY = {
  freeCancellationWindowHours: '',
  cancellationDeadlineHours: '',
  lateCancellationRefundPct: '',
  postponementAllowed: false,
  postponementDeadlineHours: '',
  maxPostponements: '',
};

const toValues = (policy) =>
  policy
    ? {
        ...Object.fromEntries(NUMBER_FIELDS.map((f) => [f, policy[f] ?? ''])),
        postponementAllowed: !!policy.postponementAllowed,
      }
    : EMPTY;

/** What the policy means for a renter, in plain words — shown under the form so the owner sees the effect. */
export function policySummary(p) {
  if (!p) return [];
  const lines = [];
  const free = Number(p.freeCancellationWindowHours);
  const deadline = Number(p.cancellationDeadlineHours);
  const pct = Number(p.lateCancellationRefundPct);
  if (Number.isFinite(free)) lines.push(`Free cancellation, full refund, up to ${free} hours before pick-up.`);
  if (Number.isFinite(deadline) && Number.isFinite(pct)) {
    lines.push(`Later than that, but at least ${deadline} hours before pick-up: ${pct}% refund.`);
    lines.push(`No cancelling within ${deadline} hours of pick-up.`);
  }
  if (p.postponementAllowed) {
    const max = Number(p.maxPostponements);
    lines.push(`Renters can move their dates up to ${Number(p.postponementDeadlineHours)} hours before pick-up, at most ${max} time${max === 1 ? '' : 's'}.`);
  } else {
    lines.push('Renters cannot move their dates.');
  }
  return lines;
}

/**
 * The cancellation and postponement rules a booking runs under (`BookingPolicyRequest` — every field required,
 * whole numbers 0 or more, the refund 0–100%), with a plain-words summary of what renters get. Shared by the
 * owner's own policy and the platform's default (administrators).
 *
 * @param {object} [policy] — the current `BookingPolicyResponse`
 * @param {function} onSave — gets the `BookingPolicyRequest`
 * @param {boolean} [saving]
 */
export default function BookingPolicyForm({ policy, onSave, saving = false }) {
  const [values, setValues] = useState(() => toValues(policy));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setValues(toValues(policy));
  }, [policy]);

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  function submit(e) {
    e.preventDefault();
    const problems = {};
    const request = { postponementAllowed: !!values.postponementAllowed };
    for (const f of NUMBER_FIELDS) {
      // The backend still requires the moving-dates numbers when moving isn't allowed: 0 then.
      if (!values.postponementAllowed && (f === 'postponementDeadlineHours' || f === 'maxPostponements')) {
        request[f] = 0;
        continue;
      }
      const raw = String(values[f]).trim();
      const n = Number(raw);
      if (raw === '' || !Number.isInteger(n) || n < 0) problems[f] = 'Enter a whole number, 0 or more.';
      else if (f === 'lateCancellationRefundPct' && n > 100) problems[f] = 'Enter a percentage from 0 to 100.';
      else request[f] = n;
    }
    if (!problems.freeCancellationWindowHours && !problems.cancellationDeadlineHours && request.cancellationDeadlineHours > request.freeCancellationWindowHours) {
      problems.cancellationDeadlineHours = 'This must be no more than the free-cancellation window.';
    }
    setErrors(problems);
    if (Object.keys(problems).length === 0) onSave(request);
  }

  const number = (field, label, hint, extra = {}) => (
    <Input
      label={label}
      hint={hint}
      type="number"
      min="0"
      step="1"
      inputMode="numeric"
      value={values[field]}
      onChange={set(field)}
      error={errors[field]}
      {...extra}
    />
  );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <h3 className="font-heading text-ink text-base font-semibold">Cancellation</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {number('freeCancellationWindowHours', 'Free cancellation (hours)', 'Full refund up to this many hours before pick-up.')}
          {number('cancellationDeadlineHours', 'Last cancellation (hours)', 'No cancelling closer to pick-up than this.')}
          {number('lateCancellationRefundPct', 'Late refund (%)', 'Refunded when cancelling between the two.', { max: '100' })}
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-ink/10 pt-5">
        <h3 className="font-heading text-ink text-base font-semibold">Moving the dates</h3>
        <Checkbox checked={values.postponementAllowed} onChange={set('postponementAllowed')} label="Renters can move their booking to new dates" />
        {values.postponementAllowed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {number('postponementDeadlineHours', 'Up to (hours before pick-up)', 'No moving closer to pick-up than this.')}
            {number('maxPostponements', 'How many times', 'Times one booking can be moved.')}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-ink/5 border border-ink/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">What renters get</p>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-ink list-disc pl-5">
          {policySummary({ ...values, postponementDeadlineHours: values.postponementDeadlineHours || 0, maxPostponements: values.maxPostponements || 0 }).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <Button type="submit" className="self-start" loading={saving}>
        {!saving && <Save size={15} aria-hidden="true" />} Save policy
      </Button>
    </form>
  );
}
