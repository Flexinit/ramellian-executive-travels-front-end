import { useMutation } from '@tanstack/react-query';
import { apiPost } from '../lib/api';

/**
 * Sends one message to the Ramellian in-app assistant and gets its reply — `POST /bot/inapp`
 * (JWT-authenticated; confirmed against the live OpenAPI spec 2026-10-06), taking `{ message }` and
 * answering `{ text, media }` (`media` is `BotMedia[]`, each `{ type, url, caption, filePath, fileName }`).
 * Stateless on the backend: there is no endpoint to list a past conversation, so the running transcript
 * only ever exists in whichever component keeps it in state — lost on reload. A separate
 * `/bot/whatsapp/inbound` also exists, but it's a webhook the WhatsApp provider (Baileys) calls on the
 * backend directly; nothing here ever calls it.
 */
export function useSendBotMessage() {
  return useMutation({
    mutationFn: (message) => apiPost('/bot/inapp', { message }),
  });
}
