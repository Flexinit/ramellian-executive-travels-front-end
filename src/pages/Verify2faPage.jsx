import React, { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import PageTitle from '../components/layout/PageTitle';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useVerify2fa } from '../hooks/useAuth';

const CODE_LENGTH = 6;

export default function Verify2faPage() {
  const location = useLocation();
  const email = location.state?.email;
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''));
  const inputRefs = useRef([]);
  const verify2fa = useVerify2fa();

  const code = digits.join('');
  const complete = code.length === CODE_LENGTH;

  function setDigit(index, value) {
    const clean = value.replace(/\D/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = clean;
      return next;
    });
    if (clean && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(e, index) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setDigits(Array.from({ length: CODE_LENGTH }, (_, i) => pasted[i] || ''));
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!complete || !email) return;
    verify2fa.mutate({ email, code });
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-brand-dark px-4 py-12">
      <PageTitle title="Verify Code" />
      <div className="w-full max-w-sm flex flex-col gap-8">

        <div className="bg-brand-navy border border-white/10 rounded-2xl shadow-card p-7 sm:p-8 flex flex-col gap-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-brand-gold/10 flex items-center justify-center">
            <ShieldCheck size={24} className="text-brand-gold" aria-hidden="true" />
          </div>

          <div>
            <h1 className="font-heading text-brand-white text-2xl font-bold">Two-factor verification</h1>
            <p className="text-brand-grey text-sm mt-1.5">
              Enter the 6-digit code {email ? <>sent to <span className="text-brand-white">{email}</span></> : 'from your authenticator'}.
            </p>
          </div>

          {!email && (
            <ErrorBanner message="We couldn't find which account this is for — please log in again." />
          )}

          {verify2fa.isError && (
            <ErrorBanner
              message={verify2fa.error?.response?.data?.message || 'Invalid or expired code. Please try again.'}
            />
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
                  className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-semibold rounded-xl bg-white/5 border border-white/10 text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent transition"
                />
              ))}
            </div>

            <Button type="submit" size="lg" loading={verify2fa.isPending} disabled={!complete || !email}>
              Verify &amp; Continue
            </Button>
          </form>
        </div>

        <p className="text-center text-brand-grey text-sm">
          <Link to="/auth/login" className="text-brand-gold hover:text-brand-gold-light font-semibold focus-ring rounded-md">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
