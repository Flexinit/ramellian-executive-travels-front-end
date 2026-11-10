import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, CreditCard } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import SegmentedControl from '../ui/SegmentedControl';
import PesapalFrame from './PesapalFrame';
import MpesaLogo from './MpesaLogo';
import { MpesaPromptWait } from './PaymentStatusPanel';
import { overstayStatusKey, useMpesaOverstayCheckout, useOverstayCheckout, useOverstayStatus } from '../../hooks/usePayment';
import { useAuthStore } from '../../store/authStore';
import { MPESA_CONFIRM_SECONDS, MPESA_PROMPT_SECONDS, PAYMENT_STATUSES } from '../../lib/constants';
import { mpesaNumber } from '../../lib/phone';
import { formatCurrency } from '../../lib/utils';

const MpesaIcon = () => <MpesaLogo size={18} />;

/** M-Pesa first, as on the booking's own payment page (product owner, 2026-10-27). */
const METHODS = [
  { value: 'mpesa', label: 'M-Pesa', icon: MpesaIcon },
  { value: 'pesapal', label: 'Card & other', icon: CreditCard },
];

/**
 * Paying a booking's overstay charge in a dialog, two ways:
 *  - **M-Pesa** — a prompt to the renter's phone (`useMpesaOverstayCheckout`), the same minute's countdown and result as
 *    the booking's own M-Pesa payment (`MpesaPromptWait`), with the outcome read from the overstay status
 *    (`useOverstayStatus`). The dialog says so the moment it's paid.
 *  - **Card & other** — Pesapal's page inside the dialog (PesapalFrame), rather than leaving the portal for it.
 * When either is finished the booking list is refreshed, so the charge shows as paid once confirmed.
 *
 * @param {boolean} isOpen
 * @param {object} booking
 * @param {function} onClose
 * @param {function} [onPaid] — a Pesapal payment in the frame is finished (before the dialog closes); its confirmation
 *   comes later, so the caller shows it as being confirmed
 */
export default function OverstayPaymentModal({ isOpen, booking, onClose, onPaid }) {
  const queryClient = useQueryClient();
  const accountPhone = useAuthStore((s) => s.user?.phoneNumber || '');
  const [method, setMethod] = useState('mpesa');
  const [phone, setPhone] = useState(accountPhone);
  const [phoneError, setPhoneError] = useState(null);
  const [prompt, setPrompt] = useState(null); // { phone, at } — the M-Pesa prompt last sent
  const [confirmingUntil, setConfirmingUntil] = useState(0);
  const [confirmedNothing, setConfirmedNothing] = useState(false);
  const [pesapalUrl, setPesapalUrl] = useState(null);
  const pesapal = useOverstayCheckout();
  const mpesa = useMpesaOverstayCheckout();

  const promptEndsAt = prompt ? prompt.at + MPESA_PROMPT_SECONDS * 1000 : 0;
  const status = useOverstayStatus(booking.id, {
    enabled: isOpen && !!prompt,
    pollUntil: Math.max(promptEndsAt, confirmingUntil),
    holdFailedUntil: promptEndsAt,
  });
  const paid = !!prompt && status.data?.status === PAYMENT_STATUSES.SUCCESSFUL;
  const confirming = Date.now() < confirmingUntil && !paid;

  // "I've completed the payment" checks for a little while; when that runs out with nothing in, say so.
  useEffect(() => {
    if (!confirmingUntil) return undefined;
    const timer = setTimeout(() => {
      setConfirmingUntil(0);
      setConfirmedNothing(true);
    }, Math.max(0, confirmingUntil - Date.now()));
    return () => clearTimeout(timer);
  }, [confirmingUntil]);

  useEffect(() => {
    if (paid) queryClient.invalidateQueries({ queryKey: ['bookings'] });
  }, [paid, queryClient]);

  function reset() {
    setPrompt(null);
    setConfirmingUntil(0);
    setConfirmedNothing(false);
    setPesapalUrl(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function sendPrompt(to) {
    const number = mpesaNumber(to);
    if (!number) {
      setPhoneError('Enter a Kenyan M-Pesa number, e.g. 0712 345 678.');
      return;
    }
    setPhoneError(null);
    const sent = await mpesa.mutateAsync({ bookingId: booking.id, phone: number }).catch(() => null);
    if (!sent) return;
    // A new prompt: the last one's result mustn't show for it.
    queryClient.removeQueries({ queryKey: overstayStatusKey(booking.id) });
    setConfirmingUntil(0);
    setConfirmedNothing(false);
    setPrompt({ phone: number, at: Date.now() });
  }

  function payByCard() {
    pesapal.mutate(booking.id, { onSuccess: (data) => setPesapalUrl(data?.redirectUrl || null) });
  }

  function pesapalDone() {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    toast.success('Thanks — your overstay payment is being confirmed.');
    onPaid?.();
    close();
  }

  let body;
  if (pesapalUrl) {
    body = <PesapalFrame url={pesapalUrl} onDone={pesapalDone} />;
  } else if (paid) {
    body = (
      <div className="flex flex-col items-center gap-3 text-center py-2">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 size={20} className="text-emerald-600" aria-hidden="true" />
        </div>
        <div>
          <p className="text-ink font-semibold">Overstay paid</p>
          <p className="text-muted text-sm mt-1">Thanks — your M-Pesa payment is in.</p>
        </div>
        <Button onClick={close}>Done</Button>
      </div>
    );
  } else if (prompt) {
    body = (
      <MpesaPromptWait
        phone={prompt.phone}
        promptedAt={prompt.at}
        failed={status.data?.status === PAYMENT_STATUSES.FAILED || status.data?.status === PAYMENT_STATUSES.INVALID}
        confirming={confirming}
        confirmedNothing={confirmedNothing && !confirming}
        onConfirmPaid={() => {
          setConfirmedNothing(false);
          setConfirmingUntil(Date.now() + MPESA_CONFIRM_SECONDS * 1000);
          status.refetch();
        }}
        onRetry={() => sendPrompt(prompt.phone)}
        onRecheck={() => status.refetch()}
        onChangeNumber={() => { setPhone(prompt.phone); reset(); }}
        retrying={mpesa.isPending}
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-4">
        <SegmentedControl label="How to pay" size="sm" options={METHODS} value={method} onChange={setMethod} className="self-start" />
        {method === 'mpesa' ? (
          <>
            <Input
              label="M-Pesa phone number"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              hint="We'll send a payment prompt to this phone — enter your M-Pesa PIN there."
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setPhoneError(null); }}
              error={phoneError}
            />
            <Button variant="mpesa" loading={mpesa.isPending} disabled={mpesa.isPending} onClick={() => sendPrompt(phone)}>
              {!mpesa.isPending && <MpesaLogo size={20} />} Send M-Pesa prompt
            </Button>
          </>
        ) : (
          <Button loading={pesapal.isPending} disabled={pesapal.isPending} onClick={payByCard}>
            {!pesapal.isPending && <CreditCard size={16} aria-hidden="true" />} Continue to Pesapal
          </Button>
        )}
      </div>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title={`Pay overstay ${formatCurrency(booking.overstayAmount ?? 0)}`} size={pesapalUrl ? 'lg' : 'md'}>
      {body}
    </Modal>
  );
}
