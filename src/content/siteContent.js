/**
 * The public pages' words, in one place — read by the pages themselves AND by the build (vite-plugins/seo.js), which
 * writes them into each page's HTML so search engines, link previews and AI answer engines that don't run JavaScript
 * still see the real content. Plain data only (no JSX, no `@/` imports): vite.config.js loads this in Node.
 *
 * Every FAQ answer describes what the portal actually does — answer engines quote these word for word.
 */

export const FAQS = [
  {
    question: 'How do I rent a car with Ramellian Executive Travels?',
    answer:
      'Browse the vehicles, choose your dates, whether you will drive yourself or be chauffeured, and where the trip starts and ends, then press Book now. You see the full price before you pay. You only need an account at checkout.',
  },
  {
    question: 'Do I need an account to see vehicles and prices?',
    answer:
      'No. Anyone can browse the fleet, open a vehicle and see its daily rate and the price for their dates. You create an account (or log in) at checkout, and your booking is kept while you do.',
  },
  {
    question: 'What documents do I need to rent a vehicle?',
    answer:
      'A valid national ID or passport, and a driving licence for self-drive. You upload them in your account. You can book before they are approved, but they must be in place before you collect the vehicle.',
  },
  {
    question: 'What is the difference between self-drive and chauffeured hire?',
    answer:
      'Self-drive means you drive the vehicle yourself for the dates you book. Chauffeured hire comes with a vetted driver for the whole trip — ideal for airport transfers, weddings, corporate travel and long-distance journeys.',
  },
  {
    question: 'Can the car be delivered to me?',
    answer:
      'Yes. When booking you can collect the vehicle yourself at no extra cost, or ask for it to be delivered to your address for a flat delivery fee, which is shown in your price before you pay.',
  },
  {
    question: 'How do I pay for a booking?',
    answer:
      'Securely online through Pesapal, after you have read and accepted the rental contract. We do not take cash for bookings, and your receipt is available in your account.',
  },
  {
    question: 'Can I cancel or change my booking?',
    answer:
      'Yes. Every booking follows a cancellation policy that is shown before you book: a full refund up to a set number of hours before pickup, a partial refund after that. You can also move your dates or cancel from My Bookings.',
  },
  {
    question: 'Are the vehicles insured?',
    answer:
      'Yes. Every vehicle on Ramellian must have comprehensive insurance, and its insurance sticker is checked before the vehicle is approved for booking.',
  },
  {
    question: 'Do you offer airport transfers at JKIA?',
    answer:
      'Yes. Chauffeured airport transfers to and from Jomo Kenyatta International Airport (JKIA), with your chauffeur following your flight so early or late arrivals are covered.',
  },
  {
    question: 'Do you offer long-distance or upcountry trips?',
    answer:
      'Yes — chauffeured long-distance routes, including safaris, coastal trips and upcountry travel, are one of our core services.',
  },
  {
    question: 'Where does Ramellian Executive Travels operate?',
    answer:
      'We are based in Nairobi, Kenya. Vehicles are available across Nairobi, and chauffeured trips go beyond the city — to the coast, upcountry and on safari.',
  },
  {
    question: 'Can I list my own car on Ramellian?',
    answer:
      'Yes. Create an account, choose to list your car, and add its details, photos and insurance. Once approved, renters can book it. You are paid for each booking after the renter collects the vehicle; Ramellian keeps a commission from your share.',
  },
  {
    question: 'How quickly will you respond to a custom quote request?',
    answer: 'Our team typically responds to requests sent through the Contact page within one business day.',
  },
];

/**
 * Services — `id` matches the anchors the Navbar/Footer link to (docs/menu-structure.md §3.2, §7). The page adds
 * an icon for each.
 */
export const SERVICES = [
  {
    id: 'corporate',
    title: 'Corporate Transport',
    summary: 'Reliable daily transport for executives and teams, billed on your terms.',
    details:
      'From single-executive pickups to coordinated multi-vehicle staff transport, we run on your schedule with monthly billing available for corporate accounts. Every driver is vetted and briefed on your visitors’ itinerary in advance.',
  },
  {
    id: 'airport',
    title: 'Airport Transfers',
    summary: 'Flight-tracked pickups at JKIA arrivals — never wait, never miss a flight.',
    details:
      'We track your flight in real time, so your chauffeur adjusts for early or delayed arrivals automatically. Meet-and-greet at arrivals with a name board is included on every airport transfer.',
  },
  {
    id: 'weddings',
    title: 'Events & Weddings',
    summary: 'Arrive in style for weddings, galas, and milestone celebrations.',
    details:
      'Decorated executive vehicles, coordinated bridal party convoys, and precise timing around your event schedule — including cake and gift transportation on request.',
  },
  {
    id: 'long-distance',
    title: 'Long-Distance Routes',
    summary: 'Comfortable, chauffeured journeys beyond the city — safaris and upcountry trips.',
    details:
      'Experienced long-haul chauffeurs, well-maintained vehicles, and flexible multi-day itineraries for safaris, coastal getaways, and upcountry travel.',
  },
  {
    id: 'conferences',
    title: 'Conferences & Business Meetings',
    summary: 'Coordinated fleets for delegations, conferences, and multi-stop itineraries.',
    details:
      'We manage fleets of vehicles for delegations and conference logistics, with a single point of contact coordinating pickups, waiting times, and multi-stop schedules.',
  },
  {
    id: 'secure',
    title: 'Secure Journey Management',
    summary: 'Vetted chauffeurs, tracked routes, and 24/7 oversight for sensitive travel.',
    details:
      'For clients who need an added layer of assurance: background-checked chauffeurs, live route tracking, and round-the-clock coordination with our operations desk.',
  },
];

/** The About page's story, one paragraph per entry. */
export const ABOUT_STORY = [
  'Ramellian Executive Travels was founded to close a gap we kept running into ourselves: Nairobi had plenty of taxis and plenty of car rentals, but very few options that treated business travel, weddings, and family journeys with the same level of care an executive would expect anywhere else in the world.',
  'We started with a small fleet of carefully maintained vehicles and a simple promise — every pickup on time, every chauffeur vetted, every trip tracked from start to finish. That promise hasn’t changed as we’ve grown to serve corporate accounts, wedding parties, conference delegations, and travellers who’d simply rather self-drive on their own schedule.',
  'Today, Ramellian offers both chauffeured hire and self-drive rentals across Nairobi and beyond, backed by secure online payments and a support team that answers the phone.',
];

/** The About page's values; the page adds an icon for each. */
export const VALUES = [
  { title: 'Reliability', description: 'On-time pickups, well-maintained vehicles, and chauffeurs who show up prepared — every time.' },
  { title: 'Trust', description: 'Vetted drivers, transparent pricing, and secure payments. No surprises, no hidden fees.' },
  { title: 'Excellence', description: 'From the vehicle to the drive itself, every detail is held to an executive standard.' },
];
