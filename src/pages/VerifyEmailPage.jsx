import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MailCheck, MessageCircle } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import PageTitle from '../components/layout/PageTitle';
import ErrorBanner from '../components/ui/ErrorBanner';
import CircularCountdown from '../components/ui/CircularCountdown';
import { useResendVerification, useSendWhatsAppCode, useVerifyEmail, useVerifyWhatsApp } from '../hooks/useAuth';
import { CODE_WINDOW_SECONDS, getCodeSentAt } from '../lib/codeTimer';
import { apiErrorMessage } from '../lib/apiError';
import { isWhatsAppVerificationEnabled } from '../lib/features';

/** The last few digits of a phone number, so the person can tell which number the code went to. */
function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 3 ? `•••• ${digits.slice(-3)}` : '';
}

/**
 * Verifies the account with the 6-digit code it was sent — by email (`POST /auth/verify-email`,
 * `{ email, code }`) or on WhatsApp (`POST /auth/verify-whatsapp`, same body). Which one is
 * chosen at registration (route state `channel`, default email), and the person can switch: "Get
 * the code on WhatsApp instead" asks the backend to send one to the account's WhatsApp number
 * (`POST /auth/send-whatsapp-code`), "Get the code by email instead" resends by email
 * (`POST /auth/resend-verification`). Email is pre-filled from the register flow's route state;
 * otherwise (e.g. the person navigated here directly) it's a plain field.
 *
 * A round one-minute countdown runs from the moment the code was sent (at registration, or on
 * "Resend code"), kept across a reload so it shows the true time left. When it runs out the person
 * is offered a fresh code; the form still accepts a code at any time (the backend, not this timer,
 * decides whether a code is still valid). The timer only shows when we know a code was just sent —
 * someone arriving here directly gets a plain "Resend code" button.
 */
export default function VerifyEmailPage() {
  const location = useLocation();
  const knownEmail = location.state?.email;
  // WhatsApp verification is switched off for now (lib/features.js): the page only ever verifies by email.
  const whatsappOffered = isWhatsAppVerificationEnabled();
  const [channel, setChannel] = useState(whatsappOffered && location.state?.channel === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL');
  const whatsapp = channel === 'WHATSAPP';
  const maskedPhone = maskPhone(location.state?.phoneNumber);

  const [email, setEmail] = useState(knownEmail || '');
  const [code, setCode] = useState('');
  const verifyEmail = useVerifyEmail();
  const verifyWhatsApp = useVerifyWhatsApp();
  const verify = whatsapp ? verifyWhatsApp : verifyEmail;
  const resendEmail = useResendVerification();
  const sendWhatsApp = useSendWhatsAppCode();
  const resend = whatsapp ? sendWhatsApp : resendEmail;
  const switching = whatsapp ? resendEmail : sendWhatsApp;

  const activeEmail = (knownEmail || email).trim();
  const initialSentAt = knownEmail ? getCodeSentAt(knownEmail) : null;
  const [sentAt, setSentAt] = useState(initialSentAt);
  const [expired, setExpired] = useState(() => initialSentAt !== null && Date.now() >= initialSentAt + CODE_WINDOW_SECONDS * 1000);

  function handleSubmit(e) {
    e.preventDefault();
    if (activeEmail && code.trim()) {
      verify.mutate({ email: activeEmail, code: code.trim() });
    }
  }

  function restartTimer() {
    setSentAt(Date.now());
    setExpired(false);
  }

  function handleResend() {
    if (!activeEmail) return;
    resend.mutate({ email: activeEmail }, { onSuccess: restartTimer });
  }

  /** Sends a code the other way and moves the page over to it. */
  function handleSwitch() {
    if (!activeEmail) return;
    switching.mutate(
      { email: activeEmail },
      {
        onSuccess: () => {
          setChannel(whatsapp ? 'EMAIL' : 'WHATSAPP');
          setCode('');
          restartTimer();
        },
      }
    );
  }

  const timerRunning = sentAt !== null && !expired;
  const Icon = whatsapp ? MessageCircle : MailCheck;

  return (
    <div className="flex-1 flex items-center justify-center bg-canvas px-4 py-12">
      <PageTitle title={whatsapp ? 'Verify WhatsApp' : 'Verify Email'} />
      <div className="w-full max-w-sm flex flex-col gap-8">

        <div className="bg-surface border border-black/10 rounded-2xl shadow-card p-7 sm:p-8 flex flex-col gap-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
            <Icon size={24} className="text-accent" aria-hidden="true" />
          </div>

          <div>
            <h1 className="font-heading text-ink text-2xl font-bold">{whatsapp ? 'Verify on WhatsApp' : 'Verify your email'}</h1>
            <p className="text-muted text-sm mt-1.5">
              {whatsapp ? (
                <>
                  We sent a 6-digit code to your WhatsApp
                  {maskedPhone ? <> number <span className="text-ink">{maskedPhone}</span></> : ' number'}.
                </>
              ) : knownEmail ? (
                <>We sent a verification code to <span className="text-ink">{knownEmail}</span>.</>
              ) : (
                'Enter your email and the verification code we sent you.'
              )}
            </p>
          </div>

          {verify.isSuccess && (
            <p className="text-emerald-600 text-sm font-medium">{whatsapp ? 'WhatsApp verified' : 'Email verified'} — taking you on…</p>
          )}

          {verify.isError && (
            <ErrorBanner message={verify.error?.response?.data?.message || 'Verification failed. Check the code and try again.'} />
          )}

          {!verify.isSuccess && (
            <>
              {timerRunning && (
                <div className="flex flex-col items-center gap-2">
                  <CircularCountdown
                    startedAt={sentAt}
                    durationSeconds={CODE_WINDOW_SECONDS}
                    onExpire={() => setExpired(true)}
                    label="left to enter your code"
                  />
                  <p className="text-muted text-xs">Time left to enter your code</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
                {!knownEmail && (
                  <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                )}
                <Input
                  label="Verification Code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder={whatsapp ? 'Enter the code from WhatsApp' : 'Enter the code from your email'}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <Button type="submit" size="lg" loading={verify.isPending}>
                  {whatsapp ? 'Verify WhatsApp' : 'Verify Email'}
                </Button>
              </form>

              {resend.isError && <ErrorBanner message={apiErrorMessage(resend.error, "Couldn't send a new code.")} />}
              {switching.isError && (
                <ErrorBanner
                  message={apiErrorMessage(
                    switching.error,
                    whatsapp ? "Couldn't send the code by email." : "Couldn't send the code on WhatsApp. Make sure your account has a WhatsApp number."
                  )}
                />
              )}

              {!timerRunning && (
                <div className="flex flex-col items-center gap-2" aria-live="polite">
                  <p className="text-muted text-sm">{expired ? "Time's up — request a new code." : "Didn't get a code?"}</p>
                  <Button size="sm" onClick={handleResend} loading={resend.isPending} disabled={!activeEmail}>
                    Resend code
                  </Button>
                </div>
              )}

              {whatsappOffered && (
                <div className="border-t border-black/10 pt-5 flex flex-col items-center gap-2">
                  <p className="text-muted text-xs">{whatsapp ? 'Prefer email?' : 'Prefer WhatsApp?'}</p>
                  <Button size="sm" onClick={handleSwitch} loading={switching.isPending} disabled={!activeEmail}>
                    {whatsapp ? 'Get the code by email instead' : 'Get the code on WhatsApp instead'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-muted text-sm">
          Wrong account?{' '}
          <Link to="/auth/login" className="text-accent hover:text-accent-hover font-semibold focus-ring rounded-md">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
