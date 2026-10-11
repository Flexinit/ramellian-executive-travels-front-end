import React from 'react';
import { TriangleAlert } from 'lucide-react';
import PageWrapper from './PageWrapper';
import PageTitle from './PageTitle';

/**
 * Shared layout for a legal page (Terms of Service, Privacy Policy) — a title, a draft notice (both of
 * these were written for the product to describe how it actually behaves, not by a lawyer, and need real
 * legal review before they're final), and a list of headed sections.
 *
 * @param {string} title
 * @param {string} [intro]
 * @param {Array<{heading: string, body: React.ReactNode}>} sections
 */
export default function LegalPage({ title, intro, sections }) {
  return (
    <PageWrapper className="max-w-3xl">
      <PageTitle title={title} />
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-heading text-brand-white text-3xl font-bold">{title}</h1>
          {intro && <p className="text-brand-grey text-sm mt-2 leading-relaxed">{intro}</p>}
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <TriangleAlert size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong>Draft — not yet legal advice or a final policy.</strong> This page describes how the
            portal actually works today. It's written by the product team, not a lawyer, and needs review
            and sign-off from Ramellian's own legal counsel before it's relied on as binding.
          </p>
        </div>

        <div className="flex flex-col gap-7">
          {sections.map((s) => (
            <section key={s.heading} className="flex flex-col gap-2">
              <h2 className="font-heading text-brand-white text-lg font-semibold">{s.heading}</h2>
              <div className="text-brand-grey text-sm leading-relaxed flex flex-col gap-2.5">{s.body}</div>
            </section>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
