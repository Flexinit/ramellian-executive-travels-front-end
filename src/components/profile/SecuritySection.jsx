import React, { useId, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { KeyRound, ScrollText, ShieldCheck } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import SegmentedControl from '../ui/SegmentedControl';
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
      <div className="flex items-center justify-between gap-3 rounded-lg bg-ink/5 px-3 py-3">
        <span className="flex flex-col">
          <span id={labelId} className="text-sm font-medium text-ink">
            Two-factor sign-in
          </span>
          <span className="text-xs text-muted">{enabled ? `On — a code is sent by ${method.toLowerCase()} each time you log in` : 'Off — add a code to your login for extra safety'}</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby={labelId}
          disabled={!me || setTwoFactor.isPending}
          onClick={() => setTwoFactor.mutate({ enabled: !enabled, method })}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed ${
            enabled ? 'bg-accent border-accent' : 'bg-ink/10 border-ink/20'
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

/**
 * The person's own recent activity (`GET /audit-logs`); a row opens the entry (`GET /audit-logs/{id}`). It has a tab of
 * its own, so when there's nothing to show (or it can't be read) it says so rather than leaving the tab blank.
 */
function RecentActivity() {
  const { data, isLoading, isError } = useAuditLogs('mine', { size: 5 });
  const [openId, setOpenId] = useState(null);
  const entries = Array.isArray(data?.content) ? data.content : [];

  return (
    <Card className="p-5 flex flex-col gap-4">
      <h3 className="flex items-center gap-2 font-heading text-ink text-base font-semibold">
        <ScrollText size={17} className="text-accent" aria-hidden="true" />
        Recent activity
      </h3>
      {isLoading ? (
        <Spinner label="Loading your activity" />
      ) : isError ? (
        <p className="text-sm text-muted">Your activity isn&apos;t available right now.</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted">No activity yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-ink/5" aria-label="Recent account activity">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button type="button" onClick={() => setOpenId(entry.id)} className="w-full flex items-center justify-between gap-3 py-2.5 text-left rounded-lg hover:bg-ink/5 px-2 focus-ring">
                <span className="flex flex-col min-w-0">
                  <span className="text-sm text-ink">{actionLabel(entry.action)}</span>
                  <span className="text-xs text-muted">{formatDateTime(entry.createdAt)}</span>
                </span>
                <Badge label={entry.status || '—'} variant={auditStatusVariant(entry.status)} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <AuditLogDetailModal scope="mine" id={openId} onClose={() => setOpenId(null)} />
    </Card>
  );
}

const SECTIONS = [
  { value: 'password', label: 'Password', icon: KeyRound },
  { value: '2fa', label: 'Two-factor', icon: ShieldCheck },
  { value: 'activity', label: 'Recent activity', icon: ScrollText },
];

/**
 * Account security on the Profile page, in tabs (product owner, 2026-10-27): change your password
 * (`PUT /users/me/password`), turn two-factor sign-in on or off (`PUT /users/me/2fa`), and see your recent activity.
 * The open one lives in the address (`?tab=security&section=activity`), next to the Profile tab.
 */
export default function SecuritySection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const section = SECTIONS.some((t) => t.value === searchParams.get('section')) ? searchParams.get('section') : 'password';
  const setSection = (value) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === 'password') next.delete('section');
      else next.set('section', value);
      return next;
    }, { replace: true });

  return (
    <section aria-labelledby="security-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="security-heading" className="flex items-center gap-2 font-heading text-ink text-xl font-bold">
          <ShieldCheck size={20} className="text-accent" aria-hidden="true" />
          Security
        </h2>
        <p className="text-muted text-sm mt-1">Keep your account safe.</p>
      </div>
      <SegmentedControl kind="tab" size="sm" label="Security section" options={SECTIONS} value={section} onChange={setSection} />
      <div role="tabpanel" aria-label={SECTIONS.find((t) => t.value === section).label}>
        {section === 'password' && (
          <Card className="p-5 flex flex-col gap-4">
            <h3 className="flex items-center gap-2 font-heading text-ink text-base font-semibold">
              <KeyRound size={17} className="text-accent" aria-hidden="true" />
              Password
            </h3>
            <ChangePassword />
          </Card>
        )}
        {section === '2fa' && (
          <Card className="p-5 flex flex-col gap-4">
            <h3 className="flex items-center gap-2 font-heading text-ink text-base font-semibold">
              <ShieldCheck size={17} className="text-accent" aria-hidden="true" />
              Two-factor sign-in
            </h3>
            <TwoFactor />
          </Card>
        )}
        {section === 'activity' && <RecentActivity />}
      </div>
    </section>
  );
}
