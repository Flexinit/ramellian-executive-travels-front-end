import React, { useState } from 'react';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import SegmentedControl from '../ui/SegmentedControl';
import { StarPicker } from './Stars';
import { useCreateReview } from '../../hooks/useReviews';
import { stripPhoneNumbers } from '../../lib/contactGuard';

const MAX = 2000; // the spec's limit for both texts

/**
 * A review of a finished booking: by the renter, of the vehicle (`POST /reviews/bookings/{id}`), or — `target:
 * 'renter'` — by the owner, of the renter (`POST /reviews/bookings/{id}/renter`). A 1–5 star rating and whether
 * they were satisfied (both required by `ReviewRequest`; "satisfied" starts from the stars — 3 or more — and can
 * be changed), plus optional feedback and complaint. Phone numbers are stripped from the text, like everything
 * else renters and owners can write.
 *
 * @param {string} bookingId
 * @param {'vehicle'|'renter'} [target]
 * @param {() => void} [onSent]
 */
export default function ReviewForm({ bookingId, target = 'vehicle', onSent }) {
  const create = useCreateReview();
  const [rating, setRating] = useState(0);
  const [satisfied, setSatisfied] = useState(null); // null = follow the stars
  const customerSatisfied = satisfied ?? rating >= 3;
  const aboutRenter = target === 'renter';
  const [feedback, setFeedback] = useState('');
  const [complaint, setComplaint] = useState('');

  function submit(e) {
    e.preventDefault();
    const clean = (text) => stripPhoneNumbers(text).text.trim();
    create.mutate(
      { bookingId, target, rating, customerSatisfied, ...(clean(feedback) ? { feedback: clean(feedback) } : {}), ...(clean(complaint) ? { complaint: clean(complaint) } : {}) },
      { onSuccess: onSent }
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <StarPicker value={rating} onChange={setRating} />
      {rating > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{aboutRenter ? 'Happy with this renter?' : 'Were you satisfied?'}</span>
          <SegmentedControl
            label={aboutRenter ? 'Happy with this renter?' : 'Were you satisfied?'}
            size="sm"
            options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
            value={customerSatisfied ? 'yes' : 'no'}
            onChange={(v) => setSatisfied(v === 'yes')}
          />
        </div>
      )}
      <Textarea
        label={aboutRenter ? 'How was this renter? (optional)' : 'How was the trip? (optional)'}
        name="feedback"
        rows={3}
        maxLength={MAX}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      <Textarea
        label={aboutRenter ? 'Any problems, e.g. damage or a late return? (optional)' : 'Anything that went wrong? (optional)'}
        name="complaint"
        rows={3}
        maxLength={MAX}
        value={complaint}
        onChange={(e) => setComplaint(e.target.value)}
      />
      <Button type="submit" className="self-start" disabled={rating < 1} loading={create.isPending}>
        Send review
      </Button>
    </form>
  );
}
