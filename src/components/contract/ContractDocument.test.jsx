// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContractDocument from './ContractDocument';

const TEXT = `# Vehicle Rental Agreement

## 1. The Parties

**The Owner**

- Name: __________
- KRA PIN: __________

**The Renter**

- Name: Felix Washioya
- Location: Nairobi

4.1 **Pay** before pick-up at __________.`;

describe('ContractDocument', () => {
  it('lays the contract out as a document, with the company in full and no Markdown symbols', () => {
    render(<ContractDocument contractText={TEXT} reference="bk-1" agreementDate="2026-10-16T09:30:00Z" />);
    const doc = screen.getByRole('article', { name: /rental contract/i });

    expect(within(doc).getByText('Ramellian Executive Travels')).toBeInTheDocument();
    expect(within(doc).getByRole('heading', { level: 1, name: 'Vehicle Rental Agreement' })).toBeInTheDocument();
    expect(within(doc).getByRole('heading', { name: '1. The Parties' })).toBeInTheDocument();
    expect(within(doc).getByText('Location')).toBeInTheDocument();
    expect(doc.textContent).not.toMatch(/[#*]|__/);
  });

  it('only shows information that is available', () => {
    render(<ContractDocument contractText={TEXT} />);
    const doc = screen.getByRole('article', { name: /rental contract/i });

    // The owner's details are all blank, so the whole "The Owner" part is left out.
    expect(within(doc).queryByText('The Owner')).not.toBeInTheDocument();
    expect(within(doc).queryByText('KRA PIN')).not.toBeInTheDocument();
    expect(within(doc).getByText('The Renter')).toBeInTheDocument();
    // A blank inside a sentence goes, with the word that introduced it.
    expect(within(doc).getByText(/before pick-up\./)).toBeInTheDocument();
    expect(doc.textContent).not.toMatch(/not provided/i);
  });

  it('always has a signing place for both the renter and the owner, each dated when signed', () => {
    render(
      <ContractDocument
        contractText={TEXT}
        renter={{ name: 'Felix Washioya', signedAt: '2026-10-16T09:42:00Z' }}
        owner={{ name: 'Ann Owner' }}
      />
    );
    const signatures = screen.getByRole('region', { name: 'Signatures' });

    expect(within(signatures).getByText('Felix Washioya')).toBeInTheDocument();
    expect(within(signatures).getByText('Signed electronically')).toBeInTheDocument();
    expect(within(signatures).getByText(/16 Oct 2026/)).toBeInTheDocument();
    expect(within(signatures).getByText('Ann Owner')).toBeInTheDocument();
    expect(within(signatures).getByText(/awaiting signature/i)).toBeInTheDocument();
  });

  it("puts the renter's signing place (the signature pad) in the renter's box", () => {
    render(<ContractDocument contractText={TEXT} renter={{ name: 'Felix' }} renterSigning={<p>the pad</p>} />);
    expect(within(screen.getByRole('region', { name: 'Signatures' })).getByText('the pad')).toBeInTheDocument();
  });

  it('reads part by part with Next, ending on the signatures', async () => {
    const user = userEvent.setup();
    const rows = Array.from({ length: 30 }, (_, i) => `- Row ${i}: value ${i}`).join('\n');
    const long = `${TEXT}\n\n## 2. More\n\n${rows}`;
    const progress = [];
    render(<ContractDocument contractText={long} staged onProgress={(p) => progress.push(p)} />);

    expect(screen.getByText(/part 1 of 3/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^next/i }));
    expect(screen.getByText(/part 2 of 3/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^next/i }));
    expect(screen.getByText(/part 3 of 3/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^next/i })).not.toBeInTheDocument();
    expect(progress.at(-1)).toEqual({ part: 2, parts: 3, atEnd: true });

    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText(/part 2 of 3/i)).toBeInTheDocument();
  });
});
