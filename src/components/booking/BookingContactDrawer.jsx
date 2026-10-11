import React from 'react';
import Drawer from '../ui/Drawer';
import ContactForm from './ContactForm';

/**
 * The "How can we reach you?" step, opened as a right-side drawer over the cart or checkout page instead of
 * navigating to the separate `/booking/contact` page — keeps the booking visible underneath while a visitor
 * who isn't signed in is asked how to reach them, the same reasoning as `LoginModal`/`RegisterModal` at
 * checkout. `/booking/contact` itself is unchanged and still works as a direct link (e.g. a shared URL, or the
 * browser's Back button landing there).
 *
 * @param {boolean} isOpen @param {function} onClose
 * @param {function} [onReopen] — forwarded to `Drawer`'s restore tab, shown after this is dismissed
 * @param {function} onSubmitted — called once the contact is validated and saved; the caller decides what
 *   happens next (BookingCartPage moves on to checkout, BookingCheckoutPage — editing an already-shared
 *   contact — just closes the drawer and stays put)
 * @param {function} [onLogin] — "Already have an account? Log in": the host opens its Log In panel in place
 */
export default function BookingContactDrawer({ isOpen, onClose, onReopen, onSubmitted, onLogin }) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} onReopen={onReopen} title="How can we reach you?" size="sm">
      <div className="flex flex-col gap-5">
        <p className="text-brand-grey text-sm -mt-2">
          Share a phone number or an email address, whichever you prefer. We use it to start your account and to
          follow up on your booking — it is never shown to vehicle owners.
        </p>
        <ContactForm onBack={onClose} onSubmitted={onSubmitted} onLogin={onLogin} />
      </div>
    </Drawer>
  );
}
