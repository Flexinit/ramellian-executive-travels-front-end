import React from 'react';
import Textarea from '../ui/Textarea';
import { useBookingStore } from '../../store/bookingStore';
import { RENTER_NOTES_MAX_LENGTH } from '../../lib/constants';
import { usePhoneGuard } from '../../hooks/usePhoneGuard';

/**
 * Free-text instructions for the owner — max 1000 chars, per FRONTEND_INTEGRATION.md §3.
 * Phone numbers can't be shared through the portal, so anything that looks like one is
 * removed as it's typed (see lib/contactGuard.js) and the person is told.
 *
 * @param {number} [rows] — Textarea's own default (4) is taller than this optional field needs when it
 *   sits inline on the vehicle page (AddToBookingPanel passes 2, to keep that page from scrolling more
 *   than it has to); left unset elsewhere keeps the shared default.
 */
export default function RenterNotesTextarea({ rows }) {
  const renterNotes = useBookingStore((s) => s.draft.renterNotes);
  const setDraft = useBookingStore((s) => s.setDraft);
  const guard = usePhoneGuard();

  return (
    <Textarea
      label="Special Instructions"
      name="renterNotes"
      placeholder="e.g. Please arrive 10 minutes early, pickup at the main gate…"
      maxLength={RENTER_NOTES_MAX_LENGTH}
      value={renterNotes}
      hint={guard.notice}
      {...(rows !== undefined ? { rows } : {})}
      onChange={(e) => setDraft({ renterNotes: guard.filter(e.target.value) })}
    />
  );
}
