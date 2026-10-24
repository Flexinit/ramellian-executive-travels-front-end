/**
 * The arithmetic behind the super admins' quotation generator (AdminQuotationPage) — and, later, automatic invoices. Invoices are made in the browser — the
 * backend has no invoice endpoint — so everything here is pure: the form keeps what was typed (strings), and the
 * totals are worked out from it every time it changes.
 *
 * Money is rounded to cents at each step a person would see on paper (each line, the discount, the VAT), so the
 * printed figures always add up.
 */

/** Kenya's standard VAT rate, the starting value on a new invoice. */
export const DEFAULT_VAT_RATE = 16;

/** A typed value as a number: blank or not a number counts as 0. */
export function toNumber(value) {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

/** Rounds to cents, avoiding the 1.005 → 1.00 float trap. */
export function roundMoney(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** `KES 12,500.00` — invoices always show cents, unlike the rest of the portal's whole-shilling prices. */
export function formatMoney(amount, currency = 'KES') {
  const n = roundMoney(toNumber(amount));
  return `${currency} ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** An empty line item. */
export function blankItem() {
  return { description: '', quantity: '1', rate: '' };
}

/**
 * A fresh document number from the date and a random suffix, e.g. `INV-20261022-4F7Q` (an invoice) or
 * `QUO-20261022-4F7Q` (a quotation). It can be edited; nothing checks it is unique, since these aren't stored anywhere.
 */
export function newInvoiceNumber(date = new Date(), random = Math.random, prefix = 'INV') {
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I, which are easy to misread on paper
  const suffix = Array.from({ length: 4 }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
  return `${prefix}-${ymd}-${suffix}`;
}

/** `YYYY-MM-DD` for a date input, in local time. */
export function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** The two kinds of document this builds: a quotation (what super admins make today) and an invoice. */
export const DOCUMENT_KINDS = Object.freeze({ QUOTATION: 'QUOTATION', INVOICE: 'INVOICE' });

/**
 * A new, empty document: today's date, one blank line, standard VAT. An invoice is due in 14 days; a quotation is
 * valid for 30 (the same `dueDate` field, shown as "Valid until").
 * @param {Date} [today]
 * @param {'QUOTATION'|'INVOICE'} [kind]
 */
export function newInvoice(today = new Date(), kind = DOCUMENT_KINDS.INVOICE) {
  const quotation = kind === DOCUMENT_KINDS.QUOTATION;
  const due = new Date(today);
  due.setDate(due.getDate() + (quotation ? 30 : 14));
  return {
    kind,
    number: newInvoiceNumber(today, Math.random, quotation ? 'QUO' : 'INV'),
    issueDate: isoDate(today),
    dueDate: isoDate(due),
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    items: [blankItem()],
    vatRate: String(DEFAULT_VAT_RATE),
    vatInclusive: false,
    discountRate: '',
    notes: '',
  };
}

/**
 * Every figure on the invoice.
 *
 * - each line's amount is quantity × rate;
 * - the discount is a percentage of the subtotal;
 * - VAT is charged on what's left. With `vatInclusive`, the rates already contain VAT, so it's taken out of that
 *   amount (rate / (100 + rate)) instead of added on top, and the total doesn't grow.
 *
 * @param {{ items: {quantity: any, rate: any}[], vatRate: any, discountRate: any, vatInclusive?: boolean }} invoice
 */
export function invoiceTotals({ items = [], vatRate, discountRate, vatInclusive = false }) {
  const lines = items.map((item) => roundMoney(toNumber(item.quantity) * toNumber(item.rate)));
  const subtotal = roundMoney(lines.reduce((sum, n) => sum + n, 0));
  const discount = roundMoney((subtotal * toNumber(discountRate)) / 100);
  const afterDiscount = roundMoney(subtotal - discount);
  const rate = toNumber(vatRate);
  const vat = vatInclusive ? roundMoney((afterDiscount * rate) / (100 + rate)) : roundMoney((afterDiscount * rate) / 100);
  const total = vatInclusive ? afterDiscount : roundMoney(afterDiscount + vat);
  return { lines, subtotal, discount, afterDiscount, vat, total };
}

/**
 * What's wrong with the invoice, field by field (empty when it's ready to print). Line item problems are keyed
 * `items.<index>.<field>`.
 */
export function invoiceProblems(invoice) {
  const problems = {};
  const doc = invoice.kind === DOCUMENT_KINDS.QUOTATION ? 'quotation' : 'invoice';
  const isNumber = (v) => String(v ?? '').trim() !== '' && Number.isFinite(Number(String(v).replace(/,/g, '')));
  if (!String(invoice.number || '').trim()) problems.number = invoice.kind === DOCUMENT_KINDS.QUOTATION ? 'Enter a quote number' : 'Enter an invoice number';
  if (!invoice.issueDate) problems.issueDate = 'Choose the date';
  if (invoice.dueDate && invoice.issueDate && invoice.dueDate < invoice.issueDate) problems.dueDate = invoice.kind === DOCUMENT_KINDS.QUOTATION ? 'Valid-until date is before the quotation date' : 'Due date is before the invoice date';
  if (!String(invoice.clientName || '').trim()) problems.clientName = `Enter who the ${doc} is for`;
  if (invoice.clientEmail && !/^\S+@\S+\.\S+$/.test(invoice.clientEmail.trim())) problems.clientEmail = 'Enter a valid email';

  invoice.items.forEach((item, i) => {
    if (!String(item.description || '').trim()) problems[`items.${i}.description`] = 'Describe the item';
    if (!isNumber(item.quantity) || toNumber(item.quantity) <= 0) problems[`items.${i}.quantity`] = 'More than 0';
    if (!isNumber(item.rate) || toNumber(item.rate) < 0) problems[`items.${i}.rate`] = 'Enter the rate';
  });
  if (invoice.items.length === 0) problems.items = 'Add at least one item';

  const vat = String(invoice.vatRate ?? '').trim();
  if (vat !== '' && (!isNumber(vat) || toNumber(vat) < 0 || toNumber(vat) > 100)) problems.vatRate = 'Between 0 and 100';
  const discount = String(invoice.discountRate ?? '').trim();
  if (discount !== '' && (!isNumber(discount) || toNumber(discount) < 0 || toNumber(discount) > 100)) problems.discountRate = 'Between 0 and 100';
  return problems;
}
