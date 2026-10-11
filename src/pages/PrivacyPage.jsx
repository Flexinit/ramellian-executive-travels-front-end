import React from 'react';
import { Link } from 'react-router-dom';
import LegalPage from '../components/layout/LegalPage';

const SECTIONS = [
  {
    heading: '1. What We Collect',
    body: (
      <p>
        Your name, email, and phone number; your profile (Individual or Business, with a business's
        registration and tax details if given); identity, driving licence, and — for a Business account —
        registration and tax documents uploaded for verification; vehicle listings and their insurance
        details, if you're an owner; booking, payment, and cancellation records; messages sent through the
        Platform; and a vehicle's recorded handover details (odometer, fuel, condition, any damage noted,
        and a signature) at pickup and return.
      </p>
    ),
  },
  {
    heading: '2. How We Use It',
    body: (
      <p>
        To run an account and a booking end to end: verifying identity and documents before a booking can be
        paid for, processing payment through Pesapal, connecting an owner and renter for a specific booking,
        and keeping a record (messages, the signed rental agreement, handover details) that either side —
        or we — can refer back to if something is disputed.
      </p>
    ),
  },
  {
    heading: '3. Who Sees What',
    body: (
      <>
        <p>
          A vehicle owner sees a renter's name and email for their own booking, and vehicle handover details
          once recorded. A renter sees the owner's email and the vehicle's listed details. Phone numbers are
          never shown to the other party and can't be shared through messages or notes — this is enforced
          automatically, not just a policy.
        </p>
        <p>
          Identity, licence, and business documents are visible to administrators reviewing them for
          approval, and to you on your own account. They are not shown to an owner or renter.
        </p>
      </>
    ),
  },
  {
    heading: '4. Payments',
    body: (
      <p>
        Payments are handled by Pesapal; we don't store full card or mobile money credentials ourselves. A
        payment receipt shows what you paid — never the platform's own commission, which is deducted from
        the owner's payout, not shown as a line item to the renter.
      </p>
    ),
  },
  {
    heading: '5. How Long We Keep It',
    body: (
      <p>
        Account, booking, and document records are kept for as long as the account exists and as needed to
        resolve a dispute or meet a legal obligation — a final retention schedule is pending legal review,
        same as the rest of this page.
      </p>
    ),
  },
  {
    heading: '6. Your Choices',
    body: (
      <p>
        You can update your profile, documents, and account type at any time. For anything else — a request
        to see, correct, or delete what's held about you — reach out through the{' '}
        <Link to="/contact" className="text-brand-gold hover:text-brand-gold-light underline">Contact</Link> page.
      </p>
    ),
  },
  {
    heading: '7. Changes to This Policy',
    body: (
      <p>
        We may update this policy as the Platform changes. Material changes will be posted here with an
        updated date once this page has a final, reviewed version.
      </p>
    ),
  },
];

/** See `LegalPage` — this content is a draft pending legal review, not final. */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="What information the Ramellian Executive Travels platform collects, why, and who it's shared with."
      sections={SECTIONS}
    />
  );
}
