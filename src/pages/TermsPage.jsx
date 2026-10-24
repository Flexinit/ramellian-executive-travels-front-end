import React from 'react';
import { Link } from 'react-router-dom';
import RentalTermsList from '../components/booking/RentalTermsList';
import { useRentalTerms } from '../hooks/useRentalTerms';
import LegalPage from '../components/layout/LegalPage';

const SECTIONS = [
  {
    heading: '1. What Ramellian Is',
    body: (
      <>
        <p>
          Ramellian Executive Travels ("Ramellian", "the Platform", "we") operates a booking platform that
          connects independent vehicle owners with people who want to rent a vehicle, chauffeured or
          self-drive. We are not a car rental company ourselves: every vehicle on the Platform belongs to,
          and is offered by, an independent owner.
        </p>
        <p>
          Our role is to run the Platform — listings, search, bookings, payments, identity and document
          verification, and a messaging channel between owner and renter — not to own, inspect, maintain,
          or operate any vehicle, and not to supervise how an owner or renter conducts themselves during a
          rental.
        </p>
      </>
    ),
  },
  {
    heading: '2. The Rental Agreement Is Between Owner and Renter',
    body: (
      <p>
        Before a booking can be paid for, the renter reviews and signs a rental agreement specific to that
        vehicle's owner. That agreement — not this page — is the binding contract governing the rental
        itself: the vehicle's condition, fuel, mileage, what happens if it's damaged, late, or driven outside
        its agreed terms, and anything else the owner has set out in it. Ramellian is not a party to that
        agreement.
      </p>
    ),
  },
  {
    heading: '3. Accounts',
    body: (
      <p>
        One account can hold more than one role (for example, renter and owner at once). You're responsible
        for the accuracy of the details on your account and profile, and for anything done through it. You
        must be legally able to enter into a rental agreement, and, for a renter booking self-drive, hold a
        valid driving licence for the vehicle's category.
      </p>
    ),
  },
  {
    heading: '4. Vehicle Owners',
    body: (
      <>
        <p>
          A vehicle can't be listed without comprehensive insurance and a verified insurance sticker. As an
          owner, you're responsible for keeping that cover current, keeping the vehicle roadworthy and as
          described in its listing, and for its condition and legal compliance throughout a rental.
        </p>
        <p>
          You set your own cancellation policy and your own rental agreement for renters to sign. The
          commission the Platform charges is deducted from your payout, not added on top of the renter's
          price.
        </p>
      </>
    ),
  },
  {
    heading: '5. Renters',
    body: (
      <p>
        You agree to use a rented vehicle lawfully, within the terms of the signed rental agreement, and to
        return it on time and in the condition agreed at pickup. You're responsible for fines, tolls,
        damage, and any other consequence of how the vehicle is used while it's in your possession —
        whether you're driving it yourself or it's chauffeured.
      </p>
    ),
  },
  {
    heading: '6. Payments',
    body: (
      <p>
        Payments are processed through Pesapal. A price shown before booking is an estimate; the final
        amount is confirmed when the booking is created. Refunds for a cancellation follow the vehicle's own
        cancellation policy, shown before you cancel.
      </p>
    ),
  },
  {
    heading: '7. Limitation of Liability',
    body: (
      <>
        <p>
          <strong>To the fullest extent the law allows, Ramellian is not liable for loss, damage, injury,
          theft, delay, or any dispute arising from or connected to a vehicle rental</strong> — including the
          condition of a vehicle, the conduct of an owner, a renter, or a chauffeur, a traffic accident, or a
          traffic violation, occurring at any point during a rental.
        </p>
        <p>
          Ramellian's role is limited to operating the booking platform, processing payments, checking
          submitted documents, and providing a channel for owner and renter to communicate and, where asked,
          helping resolve a disagreement using records the Platform holds (messages, the signed rental
          agreement, and vehicle handover records). Ramellian does not inspect, maintain, or warrant any
          vehicle, and is not responsible for what an owner or renter does or fails to do.
        </p>
        <p>
          Liability for anything that happens during a rental is governed by the rental agreement signed
          between that owner and renter, and by applicable law directly between them — not by Ramellian.
        </p>
      </>
    ),
  },
  {
    heading: '8. Indemnity',
    body: (
      <p>
        An owner or renter agrees to cover Ramellian for any claim, loss, or cost arising from their own
        vehicle, conduct, or breach of the rental agreement or these Terms.
      </p>
    ),
  },
  {
    heading: '9. Account Conduct',
    body: (
      <p>
        Phone numbers can't be shared through messages or notes on the Platform — this is enforced
        automatically. Attempting to move a conversation off-platform to avoid this, or giving false
        information on a profile, listing, or document, is a breach of these Terms.
      </p>
    ),
  },
  {
    heading: '10. Changes to These Terms',
    body: (
      <p>
        We may update these Terms as the Platform changes. Material changes will be posted here with an
        updated date once this page has a final, reviewed version.
      </p>
    ),
  },
  {
    heading: '11. Contact',
    body: (
      <p>
        Questions about these Terms can be sent through the <Link to="/contact" className="text-accent hover:text-accent-hover underline">Contact</Link> page.
      </p>
    ),
  },
];

function RentalTermsSection() {
  const { data: terms = [] } = useRentalTerms();
  if (!terms.length) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-ink text-lg font-semibold">Rental terms</h2>
      <p className="text-muted text-sm">Renters accept the terms for Everyone and Renters before booking; owners accept the ones for Everyone and Owners before listing a car.</p>
      <RentalTermsList />
    </section>
  );
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="How the Ramellian Executive Travels platform works, and where our responsibility ends and the rental agreement between owner and renter begins."
      sections={SECTIONS}
    >
      {/* The platform's own rental terms, managed by administrators (shown only when there are some). */}
      <RentalTermsSection />
    </LegalPage>
  );
}
