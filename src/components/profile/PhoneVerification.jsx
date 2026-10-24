import React, { useEffect, useState } from 'react';
import { ShieldCheck, MessageSquareText } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { usePhoneVerification } from '../../hooks/usePhoneVerification';
import { isPhoneVerificationEnabled } from '../../lib/features';

const RESEND_AFTER = 60;

/**
 * Under the profile's phone number: **Verified** once the backend says so (`UserResponse.phoneVerified`), else
 * **Verify by SMS** — a 6-digit code sent with Google Firebase, typed in here (see `usePhoneVerification`), with
 * Resend after a minute. Only when Firebase is configured (`isPhoneVerificationEnabled`) and a phone is saved.
 *
 * @param {string} [phoneNumber] — the saved phone number
 * @param {boolean} [verified]
 */
export default function PhoneVerification({ phoneNumber, verified }) {
  const { stage, error, sendCode, confirmCode, reset } = usePhoneVerification();
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  useEffect(() => reset(), [phoneNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isPhoneVerificationEnabled() || !phoneNumber) return null;

  if (verified || stage === 'done') {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
        <ShieldCheck size={15} aria-hidden="true" /> Phone number verified
      </p>
    );
  }

  async function send() {
    if (await sendCode(phoneNumber, 'phone-recaptcha')) {
      setCode('');
      setWait(RESEND_AFTER);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ink/10 bg-ink/5 px-4 py-3">
      <div id="phone-recaptcha" />
      {stage === 'code' || stage === 'verifying' ? (
        <>
          <p className="text-sm text-ink">We sent a 6-digit code to {phoneNumber}.</p>
          <div className="flex flex-wrap items-end gap-3">
            <Input
              label="Code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-40"
            />
            <Button loading={stage === 'verifying'} disabled={code.length !== 6} onClick={() => confirmCode(code)}>
              Verify
            </Button>
            <Button size="sm" disabled={wait > 0} onClick={send}>
              {wait > 0 ? `Resend in ${wait}s` : 'Resend code'}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Not verified yet. We'll send a code by SMS to confirm it's yours.</p>
          <Button size="sm" loading={stage === 'sending'} onClick={send}>
            {stage !== 'sending' && <MessageSquareText size={14} aria-hidden="true" />} Verify by SMS
          </Button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
