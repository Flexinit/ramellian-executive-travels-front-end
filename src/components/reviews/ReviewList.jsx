import React from 'react';
import Skeleton from '../ui/Skeleton';
import { Stars } from './Stars';
import { DEFAULT_RATING } from '../../lib/ratings';

/**
 * What renters said, with an average on top. A review's `complaint` is only shown when `showComplaints` is set
 * (an administrator looking into an owner), never to the public.
 *
 * @param {object[]} [reviews] — `ReviewResponse[]`
 * @param {boolean} isLoading
 * @param {boolean} [showComplaints]
 * @param {string} [emptyText]
 */
export default function ReviewList({ reviews, isLoading, showComplaints = false, emptyText = 'No reviews yet.' }) {
  if (isLoading) return <Skeleton className="h-20 w-full" />;

  const list = Array.isArray(reviews) ? reviews : [];
  if (list.length === 0) {
    // Nobody has reviewed yet, so the rating starts at the top (see lib/ratings.js). Said on one line, so the
    // starting stars don't sit above a big "No reviews yet" block that seems to contradict them.
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <Stars rating={DEFAULT_RATING} size={16} />
        <span className="text-ink font-semibold">{DEFAULT_RATING.toFixed(1)}</span>
        <span aria-hidden="true">·</span>
        <span>{String(emptyText).replace(/\.$/, '')}</span>
      </p>
    );
  }

  const average = list.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / list.length;

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-sm text-muted">
        <Stars rating={average} size={16} />
        <span className="text-ink font-semibold">{average.toFixed(1)}</span>
        from {list.length} {list.length === 1 ? 'review' : 'reviews'}
      </p>
      <ul className="flex flex-col gap-3" aria-label="Reviews">
        {list.map((review) => (
          <li key={review.id} className="rounded-[15px] border border-line bg-surface p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Stars rating={review.rating} />
              <span className="text-xs text-muted break-all">{review.reviewerEmail}</span>
            </div>
            {review.feedback && <p className="text-sm text-ink whitespace-pre-line break-words">{review.feedback}</p>}
            {showComplaints && review.complaint && (
              <p className="text-sm text-red-700 whitespace-pre-line break-words">
                <span className="font-semibold">Complaint: </span>
                {review.complaint}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
