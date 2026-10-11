import React, { useState } from 'react';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import { StarPicker } from './Stars';
import { useCreateReview } from '../../hooks/useReviews';
import { stripPhoneNumbers } from '../../lib/contactGuard';

const MAX = 2000; // the spec's limit for both texts

/**
 * A renter's review of a finished booking (`POST /reviews/bookings/{id}`): a 1–5 star rating (required) and
 * optional feedback and complaint. Phone numbers are stripped from the text, like everything else renters and
 * owners can write.
 *
 * @param {string} bookingId
 * @param {() => void} [onSent]
 */
export default function ReviewForm({ bookingId, onSent }) {
  const create = useCreateReview();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [complaint, setComplaint] = useState('');

  function submit(e) {
    e.preventDefault();
    const clean = (text) => stripPhoneNumbers(text).text.trim();
    create.mutate(
      { bookingId, rating, ...(clean(feedback) ? { feedback: clean(feedback) } : {}), ...(clean(complaint) ? { complaint: clean(complaint) } : {}) },
      { onSuccess: onSent }
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <StarPicker value={rating} onChange={setRating} />
      <Textarea label="How was the trip? (optional)" name="feedback" rows={3} maxLength={MAX} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      <Textarea label="Anything that went wrong? (optional)" name="complaint" rows={3} maxLength={MAX} value={complaint} onChange={(e) => setComplaint(e.target.value)} />
      <Button type="submit" className="self-start" disabled={rating < 1} loading={create.isPending}>
        Send review
      </Button>
    </form>
  );
}
