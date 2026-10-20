import React from 'react';
import PageWrapper from './PageWrapper';
import PageTitle from './PageTitle';

/**
 * Shared layout for a legal page (Terms of Service, Privacy Policy) — a title, an introduction, and a list of headed
 * sections, then any extra content (the Terms page adds the administrators' terms for each audience). The final, in
 * force versions — no longer marked as drafts (product owner, 2026-10-17).
 *
 * @param {string} title
 * @param {string} [intro]
 * @param {Array<{heading: string, body: React.ReactNode}>} sections
 */
export default function LegalPage({ title, intro, sections, children }) {
  return (
    <PageWrapper className="max-w-3xl">
      <PageTitle title={title} />
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-heading text-brand-white text-3xl font-bold">{title}</h1>
          {intro && <p className="text-brand-grey text-sm mt-2 leading-relaxed">{intro}</p>}
        </div>


        <div className="flex flex-col gap-7">
          {sections.map((s) => (
            <section key={s.heading} className="flex flex-col gap-2">
              <h2 className="font-heading text-brand-white text-lg font-semibold">{s.heading}</h2>
              <div className="text-brand-grey text-sm leading-relaxed flex flex-col gap-2.5">{s.body}</div>
            </section>
          ))}
        </div>

        {children}
      </div>
    </PageWrapper>
  );
}
