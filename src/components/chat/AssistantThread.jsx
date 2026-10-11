import React, { useEffect, useRef, useState } from 'react';
import { Send, FileText, Bot } from 'lucide-react';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import TypingDots from '../ui/TypingDots';
import AuthImage from '../vehicles/AuthImage';
import { mediaHost } from '../../lib/vehiclePhotos';
import { apiErrorMessage } from '../../lib/apiError';
import { useSendBotMessage } from '../../hooks/useBot';

const MAX_LENGTH = 1000;

/** A server-relative media path (e.g. `/uploads/bot/<uuid>.png`) resolved against the API host (`mediaHost`); an
 * already-absolute url (or a missing one) is returned as-is — same resolving rule `lib/vehiclePhotos.js`'s
 * `photoSrc` uses for vehicle photos, kept local here since bot media isn't a vehicle concept. */
function resolveMediaUrl(media) {
  const path = media?.url || media?.filePath;
  if (!path) return null;
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  return `${mediaHost()}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** One file/image the assistant attached to its reply. */
function MediaAttachment({ media }) {
  const src = resolveMediaUrl(media);
  if (!src) return null;
  const isImage = /image|photo|picture/i.test(media.type || '');

  if (isImage) {
    return (
      <div className="flex flex-col gap-1 mt-2">
        <AuthImage src={src} alt={media.caption || media.fileName || 'Attachment'} className="max-w-[220px] rounded-xl border border-white/10" />
        {media.caption && <span className="text-[11px] text-brand-grey">{media.caption}</span>}
      </div>
    );
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand-gold hover:text-brand-gold-light underline"
    >
      <FileText size={13} aria-hidden="true" />
      {media.caption || media.fileName || 'Open attachment'}
    </a>
  );
}

/**
 * A conversation with the Ramellian in-app assistant (`POST /bot/inapp` — see `hooks/useBot.js`). Unlike
 * `ChatThread` (two people, a real stored conversation history), this is stateless on the backend: there's
 * no endpoint to list past messages, so the transcript here lives only in this component's own state and
 * starts empty again on every reload.
 */
export default function AssistantThread() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const send = useSendBotMessage();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length, send.isPending]);

  function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || send.isPending) return;
    const mine = { id: `me-${Date.now()}`, from: 'me', text };
    setMessages((m) => [...m, mine]);
    setDraft('');
    send.mutate(text, {
      onSuccess: (reply) => {
        setMessages((m) => [...m, { id: `bot-${Date.now()}`, from: 'bot', text: reply?.text, media: reply?.media }]);
      },
      onError: (error) => {
        setMessages((m) => [
          ...m,
          { id: `bot-${Date.now()}`, from: 'bot', text: apiErrorMessage(error, "Sorry, I couldn't reply just now — please try again."), isError: true },
        ]);
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ul
        aria-label="Conversation with the assistant"
        aria-live="polite"
        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 min-h-[16rem] max-h-[55vh] overflow-y-auto"
      >
        {messages.length === 0 && (
          <li className="m-auto flex flex-col items-center gap-2 text-center py-6">
            <Bot size={28} className="text-brand-gold" aria-hidden="true" />
            <span className="text-sm text-brand-grey">
              Ask about a vehicle, a booking, or how something on the portal works.
            </span>
          </li>
        )}
        {messages.map((m) => {
          const mine = m.from === 'me';
          return (
            <li key={m.id} className={`flex flex-col max-w-[80%] ${mine ? 'self-end items-end' : 'self-start items-start'}`}>
              <span
                className={`rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words ${
                  mine
                    ? 'bg-brand-gold/15 border border-brand-gold/40 text-brand-white'
                    : m.isError
                      ? 'bg-red-500/10 border border-red-500/30 text-red-200'
                      : 'bg-white/5 border border-white/10 text-brand-white'
                }`}
              >
                {m.text}
                {m.media?.map((item, i) => <MediaAttachment key={i} media={item} />)}
              </span>
            </li>
          );
        })}
        {send.isPending && (
          <li className="flex flex-col max-w-[80%] self-start items-start">
            <span className="rounded-2xl px-4 py-2 text-sm bg-white/5 border border-white/10 text-brand-white">
              <TypingDots label="Assistant is typing" />
            </span>
          </li>
        )}
        <li ref={bottomRef} aria-hidden="true" />
      </ul>

      <form onSubmit={handleSend} className="flex flex-col gap-3" noValidate>
        <Textarea
          label="Message the assistant"
          name="message"
          rows={2}
          maxLength={MAX_LENGTH}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button type="submit" loading={send.isPending} disabled={!draft.trim()} className="self-end">
          <Send size={15} aria-hidden="true" />
          Send
        </Button>
      </form>
    </div>
  );
}
