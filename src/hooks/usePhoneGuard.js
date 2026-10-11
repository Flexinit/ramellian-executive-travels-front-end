import { useCallback, useState } from 'react';
import { stripPhoneNumbers } from '../lib/contactGuard';

/** What the person is told when a number was taken out of what they typed. */
export const PHONE_NOTICE = "Phone numbers can't be shared here, so we removed one.";

/**
 * For any box where one person writes something another will read: `filter(text)` returns the
 * text with phone numbers removed (see lib/contactGuard.js), and `notice` is the message to show
 * — it appears when a number is removed and stays until the box is emptied or `reset()` is called
 * (e.g. after sending), rather than vanishing on the next keystroke.
 *
 * @returns {{ filter: (text: string) => string, notice: string|undefined, reset: () => void }}
 */
export function usePhoneGuard() {
  const [removed, setRemoved] = useState(false);

  const filter = useCallback((text) => {
    const result = stripPhoneNumbers(text);
    if (result.removed) setRemoved(true);
    else if (!result.text.trim()) setRemoved(false);
    return result.text;
  }, []);

  const reset = useCallback(() => setRemoved(false), []);

  return { filter, notice: removed ? PHONE_NOTICE : undefined, reset };
}
