import React, { useId, useState } from 'react';
import { KeyRound, ScrollText, ShieldCheck } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import AuditLogDetailModal from '../admin/AuditLogDetailModal';
import { useCurrentUser } from '../../hooks/useProfile';
import { useChangePassword, useSetTwoFactor } from '../../hooks/useSecurity';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { actionLabel, auditStatusVariant } from '../../lib/auditLog';
import { isWhatsAppVerificationEnabled } from '../../lib/features';
import { apiErrorMessage } from '../../lib/apiError';
import { formatDateTime } from '../../lib/utils';
import { passwordProblem } from '../../lib/password';
import PasswordChecklist from '../auth/PasswordChecklist';


function ChangePassword() {
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});

  function submit(e) {
    e.preventDefault();
    const found = {};
    if (!current) found.current = 'Enter your current password';
    const problem = passwordProblem(next);
    if (problem) found.next = problem;
    if (confirm !== next) found.confirm = 'Passwords do not match';
    setErrors(found);
    if (Object.keys(found).length) return;

    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setCurrent('');
          setNext('');
          setConfirm('');
        },
        onError: (error) => setErrors({ current: apiErrorMessage(error, 'Your password was not changed.') }),
      }
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Input label="Current password" name="currentPassword" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current} />
      <Input label="New password" name="newPassword" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.next} />
      <PasswordChecklist password={next} />
      <Input label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
      <Button type="submit" className="self-start" loading={change.isPending}>
        Change password
      </Button>
    </form>
  );
}

const twoFactorMethods = () => [
  { value: 'EMAIL', label: 'Email' },
  ...(isWhatsAppVerificationEnabled() ? [{ value: 'WHATSAPP', label: 'WhatsApp' }] : []),
];

function TwoFactor() {
  const { data: me } = useCurrentUser();
  const setTwoFactor = useSetTwoFactor();
  const labelId = useId();
  const enabled = !!me?.twoFactorEnabled;
  const method = me?.twoFactorMethod || 'EMAIL';
  const methods = twoFactorMethods();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-3">
        <span className="flex flex-col">
          <span id={labelId} className="text-sm font-medium text-brand-white">
            Two-factor sign-in
          </span>
          <span className="text-xs text-brand-grey">{enabled ? `On — a code is sent by ${method.toLowerCase()} each time you log in` : 'Off — add a code to your login for extra safety'}</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby={labelId}
          disabled={!me || setTwoFactor.isPending}
          onClick={() => setTwoFactor.mutate({ enabled: !enabled, method })}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed ${
            enabled ? 'bg-brand-gold border-brand-gold' : 'bg-white/10 border-white/20'
          }`}
        >
          <span aria-hidden="true" className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      {methods.length > 1 && (
        <Select
          label="Send the code by"
          name="twoFactorMethod"
          options={methods}
          value={method}
          disabled={!me || setTwoFactor.isPending}
          onChange={(e) => setTwoFactor.mutate({ enabled, method: e.target.value })}
          placeholder="Choose"
          className="w-full sm:w-56"
        />
      )}
    </div>
  );
}

/** The person's own recent activity (`GET /audit-logs`); a row opens the entry (`GET /audit-logs/{id}`). Hidden if it can't be read. */
function RecentActivity() {
  const { data, isError } = useAuditLogs('mine', { size: 5 });
  const [openId, setOpenId] = useState(null);
  const entries = Array.isArray(data?.content) ? data.content : [];
  if (isError || entries.length === 0) return null;

  return (
    <Card className="p-5 flex flex-col gap-4">
      <h3 className="flex items-center gap-2 font-heading text-brand-white text-base font-semibold">
        <ScrollText size={17} className="text-brand-gold" aria-hidden="true" />
        Recent activity
      </h3>
      <ul className="flex flex-col divide-y divide-white/5" aria-label="Recent account activity">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button type="button" onClick={() => setOpenId(entry.id)} className="w-full flex items-center justify-between gap-3 py-2.5 text-left rounded-lg hover:bg-white/5 px-2 focus-ring">
              <span className="flex flex-col min-w-0">
                <span className="text-sm text-brand-white">{actionLabel(entry.action)}</span>
                <span className="text-xs text-brand-grey">{formatDateTime(entry.createdAt)}</span>
              </span>
              <Badge label={entry.status || '—'} variant={auditStatusVariant(entry.status)} />
            </button>
          </li>
        ))}
      </ul>
      <AuditLogDetailModal scope="mine" id={openId} onClose={() => setOpenId(null)} />
    </Card>
  );
}

/**
 * Account security on the Profile page: change your password (`PUT /users/me/password`), turn two-factor sign-in
 * on or off (`PUT /users/me/2fa`), and see your recent activity.
 */
export default function SecuritySection() {
  return (
    <section aria-labelledby="security-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="security-heading" className="flex items-center gap-2 font-heading text-brand-white text-xl font-bold">
          <ShieldCheck size={20} className="text-brand-gold" aria-hidden="true" />
          Security
        </h2>
        <p className="text-brand-grey text-sm mt-1">Keep your account safe.</p>
      </div>
      <Card className="p-5 flex flex-col gap-4">
        <h3 className="flex items-center gap-2 font-heading text-brand-white text-base font-semibold">
          <KeyRound size={17} className="text-brand-gold" aria-hidden="true" />
          Password
        </h3>
        <ChangePassword />
      </Card>
      <Card className="p-5 flex flex-col gap-4">
        <h3 className="flex items-center gap-2 font-heading text-brand-white text-base font-semibold">
          <ShieldCheck size={17} className="text-brand-gold" aria-hidden="true" />
          Two-factor sign-in
        </h3>
        <TwoFactor />
      </Card>
      <RecentActivity />
    </section>
  );
}
