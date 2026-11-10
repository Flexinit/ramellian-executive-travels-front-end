import React, { useEffect, useMemo, useState } from 'react';
import { Divide, Plus, Trash2, UserRound } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { splitEqually } from '../../hooks/useSplitPayment';
import MpesaLogo from './MpesaLogo';
import { mpesaNumber } from '../../lib/phone';
import { formatCurrency } from '../../lib/utils';

const MAX_PAYERS = 10;
const DEADLINES = [
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '180', label: '3 hours' },
  { value: '1440', label: '24 hours' },
];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let nextId = 1;
const blank = (over = {}) => ({ id: nextId++, name: '', phone: '', email: '', amount: '', ...over });

/**
 * Who pays what, for a split payment (useSplitPayment.js): the renter first (their own details filled in), then each
 * person they add — name, M-Pesa number, email (optional, for their receipt) and their share. **Split equally** shares
 * the total out; a running line shows what's left to allocate, and the request can only be sent once the shares add up
 * to the total exactly. Everyone then gets an M-Pesa prompt, and has until the chosen deadline to pay.
 *
 * @param {number} total — what the booking costs, which the shares must add up to
 * @param {{ name?: string, phone?: string, email?: string }} [you] — the renter's own details
 * @param {(request: { contributors: object[], expiryMinutes: number }) => void} onSubmit
 * @param {boolean} [submitting]
 * @param {string} [error] — why the backend refused it
 * @param {{ label: string, amount: number }[]} [breakdown] — what the total is made of, shown under it
 */
export default function SplitPaymentForm({ total, you = {}, onSubmit, submitting = false, error, breakdown = [] }) {
  const amountTotal = Math.round(Number(total) || 0);
  const [rows, setRows] = useState(() => {
    const [mine, theirs] = splitEqually(amountTotal, 2);
    return [blank({ name: you.name || '', phone: you.phone || '', email: you.email || '', amount: String(mine) }), blank({ amount: String(theirs) })];
  });
  const [deadline, setDeadline] = useState('60');
  const [problems, setProblems] = useState({});

  // The renter's details can arrive after the form (the profile loads a moment later): fill them in if still empty.
  useEffect(() => {
    setRows((r) => r.map((row, i) => (i === 0 ? {
      ...row,
      name: row.name || you.name || '',
      phone: row.phone || you.phone || '',
      email: row.email || you.email || '',
    } : row)));
  }, [you.name, you.phone, you.email]);

  // The total can settle a moment after the form opens (the fees load separately): share the new total out again.
  useEffect(() => {
    setRows((r) => {
      const amounts = splitEqually(amountTotal, r.length);
      return r.map((row, i) => ({ ...row, amount: String(amounts[i]) }));
    });
  }, [amountTotal]);

  const allocated = useMemo(() => rows.reduce((sum, r) => sum + (Math.round(Number(r.amount)) || 0), 0), [rows]);
  const left = amountTotal - allocated;

  function update(id, field, value) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
    setProblems((p) => ({ ...p, [`${id}.${field}`]: undefined, total: undefined }));
  }
  function share(list) {
    const amounts = splitEqually(amountTotal, list.length);
    return list.map((row, i) => ({ ...row, amount: String(amounts[i]) }));
  }
  function add() {
    // A new person takes an equal share; everyone else's is re-shared to match.
    setRows((r) => share([...r, blank()]));
  }
  function remove(id) {
    setRows((r) => share(r.filter((row) => row.id !== id)));
  }

  function submit(e) {
    e.preventDefault();
    const next = {};
    const phones = new Set();
    rows.forEach((row, i) => {
      const phone = mpesaNumber(row.phone);
      if (!phone) next[`${row.id}.phone`] = 'Enter a Kenyan M-Pesa number, e.g. 0712 345 678.';
      else if (phones.has(phone)) next[`${row.id}.phone`] = 'This number is already on the list.';
      else phones.add(phone);
      if (i > 0 && !row.name.trim()) next[`${row.id}.name`] = 'Enter their name.';
      if (row.email.trim() && !EMAIL.test(row.email.trim())) next[`${row.id}.email`] = 'Enter a valid email, or leave it empty.';
      const amount = Number(row.amount);
      if (!Number.isFinite(amount) || amount < 1) next[`${row.id}.amount`] = 'Enter at least KES 1.';
    });
    if (left !== 0) next.total = left > 0 ? `${formatCurrency(left)} still to share out.` : `${formatCurrency(-left)} more than the total.`;
    setProblems(next);
    if (Object.keys(next).length) return;
    onSubmit({
      expiryMinutes: Number(deadline),
      contributors: rows.map((row) => ({
        payerPhone: mpesaNumber(row.phone),
        payerName: row.name.trim() || undefined,
        payerEmail: row.email.trim() || undefined,
        amount: Math.round(Number(row.amount)),
      })),
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-label="Split the cost">
      <p className="text-sm text-muted">
        Everyone listed gets an M-Pesa prompt on their phone for their share — they just enter their PIN. The booking is
        paid once everyone has paid.
      </p>

      <ol className="flex flex-col gap-3" aria-label="Who pays">
        {rows.map((row, i) => (
          <li key={row.id} className="rounded-tile border border-line p-3 sm:p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="w-7 h-7 rounded-full bg-accent/10 text-accent inline-flex items-center justify-center" aria-hidden="true">
                  <UserRound size={14} />
                </span>
                {i === 0 ? 'You' : `Person ${i + 1}`}
              </p>
              {i > 0 && (
                <Button type="button" size="sm" variant="outline" onClick={() => remove(row.id)} aria-label={`Remove ${row.name || `person ${i + 1}`}`}>
                  <Trash2 size={14} aria-hidden="true" /> Remove
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={i === 0 ? 'Your name' : 'Name'}
                value={row.name}
                onChange={(e) => update(row.id, 'name', e.target.value)}
                error={problems[`${row.id}.name`]}
                autoComplete={i === 0 ? 'name' : 'off'}
              />
              <Input
                label="M-Pesa number"
                type="tel"
                inputMode="tel"
                value={row.phone}
                onChange={(e) => update(row.id, 'phone', e.target.value)}
                error={problems[`${row.id}.phone`]}
                autoComplete={i === 0 ? 'tel' : 'off'}
              />
              <Input
                label="Email (optional)"
                type="email"
                hint={i === 0 ? undefined : 'For their receipt'}
                value={row.email}
                onChange={(e) => update(row.id, 'email', e.target.value)}
                error={problems[`${row.id}.email`]}
                autoComplete={i === 0 ? 'email' : 'off'}
              />
              <Input
                label="Their share (KES)"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={row.amount}
                onChange={(e) => update(row.id, 'amount', e.target.value)}
                error={problems[`${row.id}.amount`]}
              />
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={add} disabled={rows.length >= MAX_PAYERS}>
          <Plus size={14} aria-hidden="true" /> Add a person
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setRows((r) => share(r))}>
          <Divide size={14} aria-hidden="true" /> Split equally
        </Button>
      </div>

      <div
        className={`rounded-tile px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2 ${left === 0 ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}
        aria-live="polite"
      >
        <span className="text-ink">
          <strong className="tabular-nums">{formatCurrency(allocated)}</strong> of <strong className="tabular-nums">{formatCurrency(amountTotal)}</strong> shared out
        </span>
        <span className={left === 0 ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-amber-700 dark:text-amber-400 font-medium'}>
          {left === 0 ? 'Adds up ✓' : left > 0 ? `${formatCurrency(left)} left` : `${formatCurrency(-left)} too much`}
        </span>
      </div>
      {breakdown.length > 1 && (
        <p className="text-xs text-muted -mt-2">
          Total: {breakdown.map((l) => `${l.label} ${formatCurrency(Math.round(l.amount))}`).join(' + ')}. Nobody pays anything on top of their share.
        </p>
      )}
      {problems.total && <p role="alert" className="text-sm text-red-600">{problems.total}</p>}

      <Select
        label="Everyone pays within"
        name="deadline"
        placeholder="Choose a time"
        options={DEADLINES}
        value={deadline}
        onChange={(e) => setDeadline(e.target.value || '60')}
      />

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button type="submit" variant="mpesa" loading={submitting} disabled={submitting}>
        {!submitting && <MpesaLogo size={20} />} Send {rows.length} payment request{rows.length === 1 ? '' : 's'}
      </Button>
    </form>
  );
}
