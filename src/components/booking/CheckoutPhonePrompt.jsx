import React, { useState } from 'react';
import { Phone } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useUpdateProfile } from '../../hooks/useProfile';
import { useCartStore } from '../../store/cartStore';
import { CONTACT_KINDS, contactProblem } from '../../lib/cart';
import { normalizePhone } from '../../lib/phone';

/**
 * Shown on checkout only to a signed-in renter whose profile has no phone number yet — sign-up asks for it and
 * saves it, so this catches older accounts (or a save that failed), the one place a missing phone is caught
 * before a booking is made. It is saved to the profile (`PATCH /users/me`, the same call as the
 * Personal Details form), so it is asked once — never again on later bookings. A phone shared on the old
 * contact step (still in some browsers' saved selection) starts the field. Never shown to vehicle owners.
 */
export default function CheckoutPhonePrompt() {
  const sharedPhone = useCartStore((s) => (s.contact?.kind === CONTACT_KINDS.PHONE ? s.contact.value : ''));
  const [value, setValue] = useState(sharedPhone);
  const [error, setError] = useState('');
  const updateProfile = useUpdateProfile();

  function handleSubmit(event) {
    event.preventDefault();
    const problem = contactProblem(CONTACT_KINDS.PHONE, value);
    if (problem) {
      setError(problem);
      return;
    }
    // On success the fresh profile lands in authStore, which hides this prompt and lets checkout continue.
    updateProfile.mutate({ phoneNumber: normalizePhone(value) });
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <div>
          <h2 className="font-heading text-ink text-sm font-semibold">Add your phone number</h2>
          <p className="text-muted text-xs mt-1">
            So we can reach you about this booking. It&apos;s saved to your profile, so you won&apos;t be asked again,
            and it is never shown to vehicle owners.
          </p>
        </div>
        <Input
          label="Phone number"
          type="tel"
          autoComplete="tel"
          required
          value={value}
          error={error}
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
        />
        <Button type="submit" loading={updateProfile.isPending} className="self-start">
          {!updateProfile.isPending && <Phone size={14} aria-hidden="true" />} Save phone number
        </Button>
      </form>
    </Card>
  );
}
