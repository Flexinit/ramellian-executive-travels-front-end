import { describe, it, expect } from 'vitest';
import { parseContract, inlineRuns } from './contractDocument';

const TEXT = `## Ramellian Platform Terms

The platform is not a party.

---

# Vehicle Rental Agreement

**Agreement reference:** bk-1
**Date of agreement:** 16 Oct 2026

## 1. The Parties

**The Owner**

- Name: __________
- Location: Nairobi

## 4. Charges

4.1 The Renter pays the full amount.

- Free cancellation up to 24 hours before pick-up.
- Postponement: Allowed

The Renter must not:

1. smoke in the Vehicle;
2. take it outside Kenya.`;

describe('parseContract', () => {
  const doc = parseContract(TEXT);

  it('takes the title from the first top-level heading, and the platform notice before the rule as the preamble', () => {
    expect(doc.title).toBe('Vehicle Rental Agreement');
    expect(doc.preamble.map((b) => b.type)).toEqual(['heading', 'paragraph']);
    expect(doc.blocks.some((b) => b.type === 'heading' && b.level === 1)).toBe(false);
  });

  it('turns "Label: value" lists and "**Label:** value" lines into details tables', () => {
    const details = doc.blocks.filter((b) => b.type === 'details');
    expect(details[0].rows).toEqual([
      { label: 'Agreement reference', value: 'bk-1' },
      { label: 'Date of agreement', value: '16 Oct 2026' },
    ]);
    expect(details[1].rows).toEqual([
      { label: 'Name', value: '__________' },
      { label: 'Location', value: 'Nairobi' },
    ]);
  });

  it('keeps sections, sub-headings, numbered clauses, bullets and numbered lists apart', () => {
    expect(doc.blocks.map((b) => b.type)).toEqual([
      'details', 'heading', 'subheading', 'details', 'heading', 'clause', 'bullets', 'paragraph', 'numbered',
    ]);
    expect(doc.blocks.find((b) => b.type === 'clause')).toEqual({ type: 'clause', number: '4.1', text: 'The Renter pays the full amount.' });
    expect(doc.blocks.find((b) => b.type === 'numbered').items).toEqual(['smoke in the Vehicle;', 'take it outside Kenya.']);
  });

  it('works for a template with no title or preamble at all', () => {
    expect(parseContract('Just one paragraph.')).toEqual({ title: null, preamble: [], blocks: [{ type: 'paragraph', text: 'Just one paragraph.' }] });
  });
});

describe('inlineRuns', () => {
  it('splits bold, italic and unfilled blanks out of the text — no Markdown symbols left', () => {
    expect(inlineRuns('**Self-drive:** only *the Renter*, ID __________.')).toEqual([
      { kind: 'bold', text: 'Self-drive:' },
      { kind: 'text', text: ' only ' },
      { kind: 'italic', text: 'the Renter' },
      { kind: 'text', text: ', ID ' },
      { kind: 'blank', text: '' },
      { kind: 'text', text: '.' },
    ]);
  });
});
