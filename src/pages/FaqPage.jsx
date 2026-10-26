import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

// The questions live in src/content/siteContent.js — the build writes them into this page's HTML and its FAQ data.
import { FAQS } from '../content/siteContent';

function FaqItem({ question, answer, isOpen, onToggle }) {
  const panelId = useId();
  return (
    <Card className="overflow-hidden">
      <h2>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-4 p-5 text-left focus-ring"
        >
          <span className="font-heading text-ink text-sm sm:text-base font-semibold">{question}</span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`shrink-0 text-accent transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </h2>
      {isOpen && (
        <div id={panelId} className="px-5 pb-5 text-muted text-sm leading-relaxed">
          {answer}
        </div>
      )}
    </Card>
  );
}

/** Frequently asked questions (docs/requirements.md PUB-06). */
export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <PageWrapper>
      <PageTitle title="FAQ" />
      <div className="flex flex-col gap-8 max-w-2xl mx-auto">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="text-brand-gold-deep text-xs font-semibold tracking-widest uppercase">Support</span>
          <h1 className="font-heading text-ink text-3xl sm:text-4xl font-bold">Frequently Asked Questions</h1>
        </div>

        <div className="flex flex-col gap-3">
          {FAQS.map((faq, i) => (
            <FaqItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>

        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <p className="text-muted text-sm">Still have questions?</p>
          <Button
            to="/contact"
          >
            Contact Us
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
