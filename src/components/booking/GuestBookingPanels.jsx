import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BookingContactDrawer from './BookingContactDrawer';
import LoginModal from '../auth/LoginModal';
import RegisterModal from '../auth/RegisterModal';

/**
 * Everything a signed-out visitor meets when they press Book — "How can we reach you?", and from there Log In
 * or Create Account — as panels sliding in from the right over the page they're on (the vehicle page, Your
 * Booking), so going on to book never feels like being sent to a new page. Sharing a contact moves on to
 * checkout; logging in lands there too (`completeLogin` sends a visitor with a selection to checkout);
 * registering goes on to verify the email, as always.
 *
 * @param {boolean} contactOpen @param {function} setContactOpen — the host decides when the contact step opens
 */
export default function GuestBookingPanels({ contactOpen, setContactOpen }) {
  const navigate = useNavigate();
  // null | 'login' | 'register' — one piece of state, so each panel's "switch to the other" link swaps them
  // without a moment where neither is open.
  const [authModal, setAuthModal] = useState(null);

  return (
    <>
      <BookingContactDrawer
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
        onReopen={() => setContactOpen(true)}
        onSubmitted={() => {
          setContactOpen(false);
          navigate('/booking/checkout');
        }}
        onLogin={() => {
          setContactOpen(false);
          setAuthModal('login');
        }}
      />
      <LoginModal
        isOpen={authModal === 'login'}
        onClose={() => setAuthModal(null)}
        onReopen={() => setAuthModal('login')}
        onSwitchToRegister={() => setAuthModal('register')}
      />
      <RegisterModal
        isOpen={authModal === 'register'}
        onClose={() => setAuthModal(null)}
        onReopen={() => setAuthModal('register')}
        onSwitchToLogin={() => setAuthModal('login')}
      />
    </>
  );
}
