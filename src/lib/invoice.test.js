import { describe, it, expect } from 'vitest';
import { formatMoney, invoiceProblems, invoiceTotals, newInvoice, newInvoiceNumber, roundMoney, toNumber } from './invoice';

describe('invoiceTotals', () => {
  it('multiplies each line, then adds VAT on top', () => {
    const t = invoiceTotals({
      items: [{ quantity: '3', rate: '15000' }, { quantity: '1', rate: '2500.50' }],
      vatRate: '16',
      discountRate: '',
    });
    expect(t.lines).toEqual([45000, 2500.5]);
    expect(t.subtotal).toBe(47500.5);
    expect(t.discount).toBe(0);
    expect(t.vat).toBe(7600.08);
    expect(t.total).toBe(55100.58);
  });

  it('takes the discount off before working out VAT', () => {
    const t = invoiceTotals({ items: [{ quantity: 2, rate: 10000 }], vatRate: 16, discountRate: 10 });
    expect(t.discount).toBe(2000);
    expect(t.afterDiscount).toBe(18000);
    expect(t.vat).toBe(2880);
    expect(t.total).toBe(20880);
  });

  it('takes VAT out of the amount, not on top, when the rates already include it', () => {
    const t = invoiceTotals({ items: [{ quantity: 1, rate: 11600 }], vatRate: 16, discountRate: 0, vatInclusive: true });
    expect(t.vat).toBe(1600);
    expect(t.total).toBe(11600);
  });

  it('counts blank or unreadable entries as zero instead of failing', () => {
    const t = invoiceTotals({ items: [{ quantity: '', rate: 'abc' }], vatRate: '', discountRate: '' });
    expect(t.total).toBe(0);
  });
});

describe('money helpers', () => {
  it('rounds to cents and formats with two decimals', () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(formatMoney(1234.5)).toBe('KES 1,234.50');
    expect(toNumber('12,500')).toBe(12500);
  });
});

describe('newInvoice', () => {
  it('starts dated today, due in 14 days, with one blank line and 16% VAT', () => {
    const inv = newInvoice(new Date(2026, 9, 22));
    expect(inv.issueDate).toBe('2026-10-22');
    expect(inv.dueDate).toBe('2026-11-05');
    expect(inv.items).toHaveLength(1);
    expect(inv.vatRate).toBe('16');
    expect(inv.number).toMatch(/^INV-20261022-[A-Z2-9]{4}$/);
  });

  it('numbers invoices from the date', () => {
    expect(newInvoiceNumber(new Date(2026, 0, 5), () => 0)).toBe('INV-20260105-AAAA');
  });
});

describe('invoiceProblems', () => {
  const ready = { ...newInvoice(new Date(2026, 9, 22)), clientName: 'Acme Ltd', items: [{ description: 'Airport transfer', quantity: '1', rate: '5000' }] };

  it('has nothing to say about a complete invoice', () => {
    expect(invoiceProblems(ready)).toEqual({});
  });

  it('asks for who it is for, and for each line to be filled in', () => {
    const problems = invoiceProblems({ ...ready, clientName: ' ', items: [{ description: '', quantity: '0', rate: '' }] });
    expect(Object.keys(problems).sort()).toEqual(['clientName', 'items.0.description', 'items.0.quantity', 'items.0.rate']);
  });

  it('keeps rates between 0 and 100 and the due date after the invoice date', () => {
    const problems = invoiceProblems({ ...ready, vatRate: '120', discountRate: '-5', dueDate: '2026-10-01' });
    expect(problems).toMatchObject({ vatRate: expect.any(String), discountRate: expect.any(String), dueDate: expect.any(String) });
  });
});
