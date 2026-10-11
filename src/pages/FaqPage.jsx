import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const FAQS = [
  {
    question: 'What documents do I need to rent a vehicle?',
    answer:
      'You need a valid national ID or passport and a driving licence for self-drive rentals. Upload them from your dashboard — they must be approved before you can book.',
  },
  {
    question: 'What is the difference between self-drive and chauffeured hire?',
    answer:
      'Self-drive means you drive the vehicle yourself for the dates you book. Chauffeured hire comes with a vetted Ramellian driver for the full trip, ideal for airport transfers, events, and long-distance travel.',
  },
  {
    question: 'How do I pay for a booking?',
    answer:
      'Payments are handled securely online once you accept your contract. We don’t take cash or manual bank transfers for bookings.',
  },
  {
    question: 'Can I cancel or change my booking?',
    answer:
      'Reach out through the Contact page or your dashboard as soon as possible. Cancellation terms are set out in your booking contract, which you review and sign before payment.',
  },
  {
    question: 'Do you offer long-distance or upcountry trips?',
    answer:
      'Yes — chauffeured long-distance routes, including safaris and coastal trips, are one of our core services. See the Services page for details.',
  },
  {
    question: 'How quickly will you respond to a custom quote request?',
    answer:
      'Our team typically responds to inquiries submitted through the Contact page within one business day.',
  },
];

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
          <span className="font-heading text-brand-white text-sm sm:text-base font-semibold">{question}</span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`shrink-0 text-brand-gold transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </h2>
      {isOpen && (
        <div id={panelId} className="px-5 pb-5 text-brand-grey text-sm leading-relaxed">
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
          <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase">Support</span>
          <h1 className="font-heading text-brand-white text-3xl sm:text-4xl font-bold">Frequently Asked Questions</h1>
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
          <p className="text-brand-grey text-sm">Still have questions?</p>
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
