import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Avatar from '../ui/Avatar';
import ErrorBanner from '../ui/ErrorBanner';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { useStartConversation } from '../../hooks/useChat';
import { useAuthStore } from '../../store/authStore';
import { matchesUserSearch, roleBadges, userDisplayName } from '../../lib/adminUsers';
import { apiErrorMessage } from '../../lib/apiError';
import { ANNOUNCEMENT_MAX_LENGTH, cleanAnnouncement } from '../../lib/announcements';

const SHOWN = 8;

/**
 * Write a message to anyone, from scratch: find the person, type, send — then land in that conversation. Finding
 * a person uses the administrator's account list (`GET /users/admin`), so this is offered to administrators.
 * Sent with `POST /chat/messages` `{ recipientId, message }`; phone numbers are removed like everywhere else.
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {string} [toId] — pre-select this person
 */
export default function NewMessageModal({ isOpen, onClose, toId }) {
  const navigate = useNavigate();
  const myId = useAuthStore((s) => s.user?.id);
  const { data: users, isLoading, isError, refetch } = useAdminUsers();
  const start = useStartConversation();
  const [search, setSearch] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setRecipientId(toId || '');
      setMessage('');
      setError('');
    }
  }, [isOpen, toId]);

  const everyone = (Array.isArray(users) ? users : []).filter((u) => u.id !== myId && u.enabled !== false);
  const matches = everyone.filter((u) => matchesUserSearch(u, search));
  const chosen = everyone.find((u) => u.id === recipientId);
  // The chosen person stays in the list even when the search no longer matches them.
  const shown = [...(chosen && !matches.includes(chosen) ? [chosen] : []), ...matches].slice(0, SHOWN);
  const clean = cleanAnnouncement(message);

  function submit(e) {
    e.preventDefault();
    setError('');
    start.mutate(
      { recipientId, message: clean.text },
      {
        onSuccess: () => {
          onClose();
          navigate(`/messages/user/${recipientId}`);
        },
        onError: (err) => setError(apiErrorMessage(err, "Your message wasn't sent.")),
      }
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New message" size="md">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Input
          label="To"
          name="search"
          type="search"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {isError ? (
          <ErrorBanner message="We couldn't load the accounts just now." onRetry={refetch} />
        ) : (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="sr-only">Who to message</legend>
            {isLoading && <p className="text-sm text-muted">Loading…</p>}
            {!isLoading && shown.length === 0 && <p className="text-sm text-muted">No one matches.</p>}
            {shown.map((u) => {
              const selected = u.id === recipientId;
              const name = userDisplayName(u);
              return (
                <label
                  key={u.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-accent ${
                    selected ? 'border-accent bg-accent/10' : 'border-ink/10 hover:border-accent/50 hover:bg-ink/5'
                  }`}
                >
                  <input type="radio" name="recipient" value={u.id} checked={selected} onChange={() => setRecipientId(u.id)} className="sr-only" aria-label={`${name}, ${u.email}`} />
                  <Avatar name={name} size="sm" />
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="text-sm text-ink truncate">{name}</span>
                    <span className="text-xs text-muted truncate">{u.email}</span>
                  </span>
                  <Badge label={roleBadges(u.roles)[0]} variant="gold" />
                  {selected && <Check size={16} className="text-accent shrink-0" aria-hidden="true" />}
                </label>
              );
            })}
            {matches.length > SHOWN && <p className="text-xs text-muted">Showing {SHOWN} of {matches.length} — type more to narrow it down.</p>}
          </fieldset>
        )}

        <Textarea
          label="Message"
          name="message"
          rows={4}
          maxLength={ANNOUNCEMENT_MAX_LENGTH}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          hint="Phone numbers are removed, as in every message on the portal."
        />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!recipientId || !clean.text} loading={start.isPending}>
            Send message
          </Button>
        </div>
      </form>
    </Modal>
  );
}
