import React from 'react';
import { Bot } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import AssistantThread from '../components/chat/AssistantThread';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import { useBotAssistantStatus } from '../hooks/usePlatformSettings';

/** The in-app assistant (`/assistant`) — a chat with Ramellian's own bot, separate from Messages (which is
 * between people). See `AssistantThread`/`hooks/useBot.js` for why it has no saved history across visits.
 * When an administrator has switched the assistant off (Platform Settings), the page says so instead. */
export default function AssistantPage() {
  const { enabled: assistantOn, loading } = useBotAssistantStatus();
  return (
    <>
      <PageWrapper className="max-w-3xl">
        <PageTitle title="Assistant" />
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold inline-flex items-center gap-2">
              <Bot size={24} className="text-accent" aria-hidden="true" />
              Assistant
            </h1>
            <p className="text-muted text-sm mt-1">
              Ask Ramellian's assistant about vehicles, bookings, or how the portal works. This chat starts
              fresh each visit — it isn't saved like your conversations in Messages.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Spinner label="Loading the assistant" /></div>
          ) : assistantOn ? (
            <AssistantThread />
          ) : (
            <EmptyState
              icon={Bot}
              title="The assistant is switched off"
              description="It isn't available right now. Please check back later."
            />
          )}
        </div>
      </PageWrapper>
    </>
  );
}
