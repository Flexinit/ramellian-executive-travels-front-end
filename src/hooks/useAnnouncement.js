import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiPost } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';

/**
 * Sends one announcement to many people. The backend has no broadcast call, so an announcement is a direct chat
 * message (`POST /chat/messages` `{ recipientId, message }`) sent to each recipient in turn — it appears in each
 * person's Messages, from the administrator. Sent one at a time, so it can be stopped part-way, and a failure for one
 * person doesn't stop the rest.
 *
 * `progress`: `{ phase: 'idle'|'sending'|'done', total, sent, failed: [{ user, reason }] }`.
 */
export function useAnnouncement() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState({ phase: 'idle', total: 0, sent: 0, failed: [], stopped: false });
  const stop = useRef(false);

  const send = useCallback(
    async (recipients, message) => {
      stop.current = false;
      let sent = 0;
      const failed = [];
      setProgress({ phase: 'sending', total: recipients.length, sent, failed, stopped: false });

      for (const user of recipients) {
        if (stop.current) break;
        try {
          await apiPost('/chat/messages', { recipientId: user.id, message });
          sent += 1;
        } catch (error) {
          failed.push({ user, reason: apiErrorMessage(error, 'Not sent.') });
        }
        setProgress({ phase: 'sending', total: recipients.length, sent, failed: [...failed], stopped: false });
      }

      setProgress({ phase: 'done', total: recipients.length, sent, failed, stopped: stop.current });
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
    [queryClient]
  );

  const cancel = useCallback(() => {
    stop.current = true;
  }, []);

  const reset = useCallback(() => setProgress({ phase: 'idle', total: 0, sent: 0, failed: [], stopped: false }), []);

  return { progress, send, cancel, reset };
}
