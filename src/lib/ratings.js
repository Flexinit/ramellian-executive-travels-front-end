/**
 * Until a vehicle or a person has real reviews, the portal shows the top rating for them. The backend sends `rating: null` for
 * anyone with no reviews yet; as soon as it sends a real average, that is what is shown. Remove `DEFAULT_RATING` (or set it to
 * `null`) when the portal should stop starting everyone at 5.
 */
export const DEFAULT_RATING = 5;

/** The rating to show: the real one when there is one, otherwise the starting rating. */
export function ratingOrDefault(rating) {
  const n = Number(rating);
  return rating != null && Number.isFinite(n) && n > 0 ? n : DEFAULT_RATING;
}
