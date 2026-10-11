import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, LogIn } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import SegmentedControl from '../ui/SegmentedControl';
import { useCartStore } from '../../store/cartStore';
import { CONTACT_KINDS, contactProblem } from '../../lib/cart';
import { useCreateBookingLead, bookingLeadsFor } from '../../hooks/useBookingLeads';

const KIND_OPTIONS = [
  { value: CONTACT_KINDS.PHONE, label: 'Phone number' },
  { value: CONTACT_KINDS.EMAIL, label: 'Email address' },
];

/**
 * The "how can we reach you" form itself — a phone number or an email address, their pick — shared by
 * BookingContactPage (the standalone `/booking/contact` route, for a direct link) and BookingContactDrawer
 * (opened in place over the cart or checkout pages) so the two hosts don't duplicate validation, lead-recording
 * and submit logic.
 *
 * @param {string} [backHref] — if given, "Back" is a real link to this path (the standalone page)
 * @param {function} [onBack] — if `backHref` is omitted, "Back" calls this instead (e.g. closes the drawer)
 * @param {function} onSubmitted — called once the contact is validated and saved
 *
 * Someone who already has an account has no use for this step — we reach them through their profile — but we
 * can't tell until they sign in. So "Already have an account? Log in" skips it: where this form is a panel,
 * `onLogin` opens the Log In panel in its place, on the same page; otherwise (the standalone page) checkout
 * opens with its Log In panel already showing (BookingCheckoutPage reads `state.auth`). Either way, logging in
 * lands them on checkout.
 *
 * @param {function} [onLogin] — open the Log In panel right here instead of going to checkout for it
 */
export default function ContactForm({ backHref, onBack, onSubmitted, onLogin }) {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const contact = useCartStore((s) => s.contact);
  const setContact = useCartStore((s) => s.setContact);

  const [kind, setKind] = useState(contact?.kind || CONTACT_KINDS.PHONE);
  const [value, setValue] = useState(contact?.value || '');
  const [error, setError] = useState('');
  const createLead = useCreateBookingLead();

  function handleKind(next) {
    setKind(next);
    setValue(contact?.kind === next ? contact.value : '');
    setError('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    const problem = contactProblem(kind, value);
    if (problem) {
      setError(problem);
      return;
    }
    const submitted = { kind, value: value.trim() };
    setContact(submitted);
    // Fire-and-forget: lets the business follow up if this booking is abandoned. Never blocks checkout, and
    // never shown to the renter if it fails — see docs/backend-requests.md item 4.
    bookingLeadsFor(items, submitted).forEach((lead) => createLead.mutate(lead));
    onSubmitted();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <SegmentedControl label="Contact by" options={KIND_OPTIONS} value={kind} onChange={handleKind} />
      <Input
        key={kind}
        label={kind === CONTACT_KINDS.EMAIL ? 'Email address' : 'Phone number'}
        type={kind === CONTACT_KINDS.EMAIL ? 'email' : 'tel'}
        autoComplete={kind === CONTACT_KINDS.EMAIL ? 'email' : 'tel'}
        required
        value={value}
        error={error}
        onChange={(e) => {
          setValue(e.target.value);
          setError('');
        }}
      />
      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
        {backHref ? (
          <Button to={backHref}>
            <ArrowLeft size={14} aria-hidden="true" /> Back
          </Button>
        ) : (
          <Button type="button" onClick={onBack}>
            <ArrowLeft size={14} aria-hidden="true" /> Back
          </Button>
        )}
        <Button size="lg" type="submit">
          <ArrowRight size={16} aria-hidden="true" /> Continue
        </Button>
      </div>
      <div className="border-t border-white/10 pt-4">
        <Button type="button" size="sm" onClick={() => (onLogin ? onLogin() : navigate('/booking/checkout', { state: { auth: 'login' } }))}>
          <LogIn size={14} aria-hidden="true" /> Already have an account? Log in
        </Button>
      </div>
    </form>
  );
}
