import React, { useState } from 'react';
import { CheckCircle2, Copy, Mail, Megaphone, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import ErrorBanner from '../components/ui/ErrorBanner';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { useAnnouncement } from '../hooks/useAnnouncement';
import { useAuthStore } from '../store/authStore';
import {
  ANNOUNCEMENT_MAX_LENGTH, AUDIENCES, DEFAULT_EMAIL_SUBJECT, buildMailtoLinks, cleanAnnouncement, emailAddresses, recipientsFor,
} from '../lib/announcements';
import { userDisplayName } from '../lib/adminUsers';

const AUDIENCE_OPTIONS = AUDIENCES.map(({ value, label }) => ({ value, label }));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * Announcements: write one message and send it to everyone in a group — all accounts, renters, owners, fleet
 * managers or administrators. The backend has no broadcast or announcement call, so each person gets it as a direct message
 * from the administrator (it shows in their Messages and counts as unread there), sent one at a time.
 */
export default function AdminAnnouncementsPage() {
  const { data: users, isLoading, isError, refetch } = useAdminUsers();
  const myId = useAuthStore((s) => s.user?.id);
  const { progress, send, cancel, reset } = useAnnouncement();
  const [audience, setAudience] = useState('ALL');
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [subject, setSubject] = useState(DEFAULT_EMAIL_SUBJECT);

  const recipients = recipientsFor(Array.isArray(users) ? users : [], audience, myId);
  const clean = cleanAnnouncement(message);
  const audienceLabel = AUDIENCES.find((a) => a.value === audience)?.label.toLowerCase();
  const sending = progress.phase === 'sending';
  const finished = progress.phase === 'done';

  const addresses = emailAddresses(recipients);
  const mail = buildMailtoLinks({ addresses, subject: subject.trim(), body: clean.text });

  async function copyAddresses() {
    try {
      await navigator.clipboard.writeText(addresses.join(', '));
      toast.success(`${plural(addresses.length, 'address', 'addresses')} copied.`);
    } catch {
      toast.error("Couldn't copy the addresses.");
    }
  }

  function start(list = recipients) {
    setConfirming(false);
    send(list, clean.text);
  }

  return (
    <PageWrapper className="max-w-3xl">
      <PageTitle title="Announcements" />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Announcements</h1>
          <p className="text-muted text-sm mt-1">
            Write once and send to a whole group. People get it as a message from you in their Messages, not as a pop-up — the backend has no
            broadcast feature, so it is sent to each person one at a time. You can also send it by email (below).
          </p>
        </div>

        {isError && <ErrorBanner message="We couldn't load the accounts just now." onRetry={refetch} />}

        {!finished && (
          <Card className="p-5 sm:p-6">
            <form
              className="flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                setConfirming(true);
              }}
            >
              <Select
                label="Send to"
                name="audience"
                options={AUDIENCE_OPTIONS}
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Choose who"
                disabled={sending}
                className="w-full sm:w-64"
              />
              <p className="text-sm text-muted -mt-2" aria-live="polite">
                {isLoading ? 'Counting…' : `${plural(recipients.length, 'person', 'people')} — every ${audience === 'ALL' ? 'account' : 'account in this group'} that is switched on, except yours.`}
              </p>

              <Textarea
                label="Message"
                name="message"
                rows={6}
                maxLength={ANNOUNCEMENT_MAX_LENGTH}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending}
                hint="Phone numbers are removed, as in every message on the portal."
              />

              <Button type="submit" className="self-start" disabled={!clean.text || recipients.length === 0 || sending}>
                <Send size={15} aria-hidden="true" />
                Review and send
              </Button>
            </form>
          </Card>
        )}

        {clean.text && recipients.length > 0 && (
          <Card className="p-5 sm:p-6 flex flex-col gap-4" role="region" aria-labelledby="email-heading">
            <div>
              <h2 id="email-heading" className="flex items-center gap-2 font-heading text-ink text-lg font-semibold">
                <Mail size={18} className="text-accent" aria-hidden="true" />
                Also send by email
              </h2>
              <p className="text-muted text-sm mt-1">
                The backend can&apos;t send email itself, so this opens <em>your</em> email app with the message written and everyone in Bcc (nobody sees anyone
                else&apos;s address) — you press Send there. It is sent from your own email address, not the portal&apos;s.
              </p>
            </div>
            <Input label="Email subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} />
            {mail.tooLong ? (
              <p className="text-sm text-red-700" role="alert">
                This message is too long to put in an email link. Copy the addresses and paste your message into a new email instead.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-3" aria-label="Email links">
                {mail.links.map((link, i) => (
                  <li key={link.href}>
                    <Button size="sm" href={link.href}>
                      <Mail size={14} aria-hidden="true" />
                      {mail.links.length > 1 ? `Open email — part ${i + 1} of ${mail.links.length} (${plural(link.count, 'person', 'people')})` : `Open in my email app (${plural(link.count, 'person', 'people')})`}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" onClick={copyAddresses}>
                <Copy size={14} aria-hidden="true" />
                Copy all {plural(addresses.length, 'address', 'addresses')}
              </Button>
              {mail.links.length > 1 && <span className="text-xs text-muted">An email link can only hold so many addresses, so the list is split into {mail.links.length} emails.</span>}
            </div>
          </Card>
        )}

        {(sending || finished) && (
          <Card className="p-5 sm:p-6 flex flex-col gap-4" aria-live="polite">
            {sending ? (
              <>
                <p className="text-ink text-sm font-medium" role="status">
                  Sending… {progress.sent + progress.failed.length} of {progress.total}
                </p>
                <div
                  role="progressbar"
                  aria-label="Announcement progress"
                  aria-valuemin={0}
                  aria-valuemax={progress.total}
                  aria-valuenow={progress.sent + progress.failed.length}
                  className="h-2 rounded-full bg-ink/10 overflow-hidden"
                >
                  <div className="h-full bg-accent transition-all" style={{ width: `${((progress.sent + progress.failed.length) / Math.max(1, progress.total)) * 100}%` }} />
                </div>
                <Button size="sm" variant="danger" className="self-start" onClick={cancel}>
                  Stop sending
                </Button>
              </>
            ) : (
              <>
                <p className="flex items-center gap-2 text-ink font-medium" role="status">
                  <CheckCircle2 size={18} className="text-green-600" aria-hidden="true" />
                  {progress.stopped ? 'Stopped. ' : ''}Sent to {plural(progress.sent, 'person', 'people')}
                  {progress.stopped ? ` of ${progress.total}` : ''}.
                </p>
                {progress.failed.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-red-700">{plural(progress.failed.length, 'message', 'messages')} could not be sent:</p>
                    <ul className="text-xs text-muted flex flex-col gap-1" aria-label="Messages that could not be sent">
                      {progress.failed.map(({ user, reason }) => (
                        <li key={user.id}>
                          <span className="text-ink break-all">{userDisplayName(user)}</span> — {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  {progress.failed.length > 0 && !progress.stopped && (
                    <Button size="sm" onClick={() => start(progress.failed.map((f) => f.user))}>
                      Try the {progress.failed.length} again
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      reset();
                      setMessage('');
                    }}
                  >
                    Write another
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}

        {!sending && !finished && recipients.length === 0 && !isLoading && !isError && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Megaphone size={15} aria-hidden="true" />
            Nobody is in this group yet.
          </p>
        )}
      </div>

      <Modal isOpen={confirming} onClose={() => setConfirming(false)} title="Send this announcement?">
        <div className="flex flex-col gap-4">
          <p className="text-muted text-sm">
            It will go to <span className="text-ink font-medium">{plural(recipients.length, 'person', 'people')}</span> ({audienceLabel}). This can&apos;t be
            taken back.
          </p>
          <p className="rounded-lg border border-ink/10 bg-subtle px-3 py-2 text-sm text-ink whitespace-pre-line break-words max-h-48 overflow-y-auto" aria-label="What will be sent">
            {clean.text}
          </p>
          {clean.removedPhone && <p className="text-xs text-muted">A phone number in your text was removed.</p>}
          <div className="flex gap-3 justify-end">
            <Button onClick={() => setConfirming(false)}>Back</Button>
            <Button onClick={() => start()}>Send now</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
