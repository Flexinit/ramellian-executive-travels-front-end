import React from 'react';
import { Bot } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageBackdrop from '../components/layout/PageBackdrop';
import PageTitle from '../components/layout/PageTitle';
import AssistantThread from '../components/chat/AssistantThread';
import nairobiSkyline from '../assets/destinations/nairobi-skyline.jpg';

/** The in-app assistant (`/assistant`) — a chat with Ramellian's own bot, separate from Messages (which is
 * between people). See `AssistantThread`/`hooks/useBot.js` for why it has no saved history across visits. */
export default function AssistantPage() {
  return (
    <PageBackdrop image={nairobiSkyline}>
      <PageWrapper className="max-w-3xl">
        <PageTitle title="Assistant" />
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold inline-flex items-center gap-2">
              <Bot size={24} className="text-brand-gold" aria-hidden="true" />
              Assistant
            </h1>
            <p className="text-brand-grey text-sm mt-1">
              Ask Ramellian's assistant about vehicles, bookings, or how the portal works. This chat starts
              fresh each visit — it isn't saved like your conversations in Messages.
            </p>
          </div>

          <AssistantThread />
        </div>
      </PageWrapper>
    </PageBackdrop>
  );
}
