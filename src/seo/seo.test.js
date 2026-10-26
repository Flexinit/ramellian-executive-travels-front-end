import { describe, it, expect } from 'vitest';
import { businessJsonLd, isPrivatePath, vehicleDescription, vehicleJsonLd, vehiclePhotos, faqJsonLd, whatsappLink, PUBLIC_PAGES } from './seoConfig';
import { renderPage } from '../../vite-plugins/seo.js';
import { FAQS } from '../content/siteContent';

const TEMPLATE = '<!doctype html><html><head><title>Ramellian Executive Travels</title></head><body><div id="root"></div></body></html>';
const CAR = {
  id: 'v1', model: 'Toyota Prado', location: 'Nairobi', capacity: 7, transmissionType: 'AUTOMATIC', fuelType: 'DIESEL',
  selfDrive: true, chauffeured: true, pricePerDay: 12000,
  photoUrls: ['/uploads/vehicles/sticker.png', '/uploads/vehicles/front.jpg'],
  insuranceVerificationStickerPhoto: 'http://192.168.8.9:8080/uploads/vehicles/sticker.png',
};

describe('seoConfig', () => {
  it('keeps signed-in areas and booking steps private, public pages public', () => {
    for (const p of ['/dashboard', '/admin/settings', '/booking/checkout', '/book/v1/payment', '/auth/login', '/messages/user/u1']) {
      expect(isPrivatePath(p)).toBe(true);
    }
    for (const p of PUBLIC_PAGES.map((x) => x.path).concat('/vehicles/v1')) expect(isPrivatePath(p)).toBe(false);
  });

  it("never offers a vehicle's insurance sticker as one of its photos", () => {
    expect(vehiclePhotos(CAR)).toEqual(['/uploads/vehicles/front.jpg']);
  });

  it('describes a vehicle in words, with its daily rate', () => {
    expect(vehicleDescription(CAR)).toBe(
      'Toyota Prado for hire in Nairobi, self-drive or with a chauffeur — 7 seats, Automatic, Diesel. From KES 12,000 per day. Book online with Ramellian Executive Travels.'
    );
  });

  it('marks a vehicle up as a product with a per-day offer in KES', () => {
    const d = vehicleJsonLd(CAR);
    expect(d['@type']).toBe('Product');
    expect(d.offers).toMatchObject({ priceCurrency: 'KES', price: 12000, priceSpecification: { unitText: 'DAY' } });
    expect(d.image).toEqual(['https://ramellianexecutivetravels.co.ke/uploads/vehicles/front.jpg']);
  });

  it("gives the business the contact details set in Platform Settings — and nothing that isn't set", () => {
    expect(businessJsonLd({ supportPhone: null, supportEmail: '' })).not.toHaveProperty('telephone');
    expect(businessJsonLd()).not.toHaveProperty('sameAs');
    const d = businessJsonLd({ supportPhone: '+254 712 345 678', supportEmail: 'hi@ramellian.co.ke', address: 'Westlands', instagram: '@ramellian', facebook: 'https://facebook.com/ramellian' });
    expect(d).toMatchObject({ telephone: '+254 712 345 678', email: 'hi@ramellian.co.ke', address: { streetAddress: 'Westlands', addressLocality: 'Nairobi' } });
    expect(d.sameAs).toEqual(['https://facebook.com/ramellian', 'https://instagram.com/ramellian']);
  });

  it('turns a WhatsApp number into a wa.me link, a local 07… number included', () => {
    expect(whatsappLink('+254 712 345 678')).toBe('https://wa.me/254712345678');
    expect(whatsappLink('0712345678')).toBe('https://wa.me/254712345678');
    expect(whatsappLink('')).toBeNull();
  });

  it('marks every FAQ up as a question with its answer', () => {
    const d = faqJsonLd();
    expect(d.mainEntity).toHaveLength(FAQS.length);
    expect(d.mainEntity[0]).toMatchObject({ '@type': 'Question', acceptedAnswer: { '@type': 'Answer' } });
  });
});

describe('build output (vite-plugins/seo.js)', () => {
  it("puts the page's title, tags, structured data and words into the HTML", () => {
    const html = renderPage(TEMPLATE, {
      title: 'FAQ | Ramellian Executive Travels',
      description: 'Answers <about> "hire"',
      path: '/faq',
      jsonLd: [{ '@type': 'FAQPage', note: '</script>' }],
      body: '<main><h1>Frequently Asked Questions</h1></main>',
    });
    expect(html).toContain('<title>FAQ | Ramellian Executive Travels</title>');
    expect(html).toContain('content="Answers &lt;about&gt; &quot;hire&quot;"');
    expect(html).toContain('<link data-rh="true" rel="canonical" href="https://ramellianexecutivetravels.co.ke/faq" />');
    expect(html).toContain('<div id="root"><main><h1>Frequently Asked Questions</h1></main></div>');
    // Structured data can't close its own <script> early.
    expect(html).not.toContain('"</script>"');
    expect(html).toContain('\\u003c/script>');
  });

  it('marks the bare app shell noindex, with no canonical', () => {
    const html = renderPage(TEMPLATE, { title: 'Ramellian Executive Travels', description: 'x', path: '/', indexable: false });
    expect(html).toContain('name="robots" content="noindex, nofollow"');
    expect(html).not.toContain('rel="canonical"');
  });
});
