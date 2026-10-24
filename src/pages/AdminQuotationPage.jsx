import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Printer, FilePlus2 } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Checkbox from '../components/ui/Checkbox';
import InvoiceDocument from '../components/admin/InvoiceDocument';
import { useAuthStore } from '../store/authStore';
import { loadDraft, saveDraft, clearDraft } from '../lib/formDraft';
import { printInvoice } from '../lib/printContract';
import { blankItem, DOCUMENT_KINDS, formatMoney, invoiceProblems, invoiceTotals, newInvoice } from '../lib/invoice';

const NUMBER_FIELD = { type: 'number', inputMode: 'decimal', min: 0, step: 'any' };

function SectionHeading({ children }) {
  return <h2 className="font-heading text-ink text-base font-semibold">{children}</h2>;
}

/**
 * Quotation generator, for super admins only (the menu item and the route both check `isSuperAdmin`): enter who
 * it's for, the items with their quantities and rates, the VAT rate and an optional discount; the quotation next to
 * the form updates as you type, and Print / Save as PDF prints just the quotation. Quotations aren't stored on the
 * platform (the backend has no endpoint for them): the one being worked on is kept in this browser until a new one
 * is started. Invoices will be generated automatically later — the same document (`InvoiceDocument`, `kind`) serves both.
 */
/** A new quotation: valid for 30 days, numbered QUO-…. */
const newQuotation = () => newInvoice(new Date(), DOCUMENT_KINDS.QUOTATION);

export default function AdminQuotationPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const draftKey = `admin-quotation.${userId || 'me'}`;
  const [invoice, setInvoice] = useState(() => {
    const draft = loadDraft(draftKey);
    return draft ? { ...draft, kind: DOCUMENT_KINDS.QUOTATION } : newQuotation();
  });
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    saveDraft(draftKey, invoice);
  }, [draftKey, invoice]);

  const totals = invoiceTotals(invoice);
  const problems = invoiceProblems(invoice);
  const errorFor = (field) => (showErrors ? problems[field] : undefined);

  const set = (field) => (e) => setInvoice((inv) => ({ ...inv, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setItem = (index, field) => (e) =>
    setInvoice((inv) => ({ ...inv, items: inv.items.map((item, i) => (i === index ? { ...item, [field]: e.target.value } : item)) }));
  const addItem = () => setInvoice((inv) => ({ ...inv, items: [...inv.items, blankItem()] }));
  const removeItem = (index) => setInvoice((inv) => ({ ...inv, items: inv.items.filter((_, i) => i !== index) }));

  function handlePrint() {
    if (Object.keys(problems).length > 0) {
      setShowErrors(true);
      toast.error('Fill in the highlighted fields first.');
      return;
    }
    printInvoice();
  }

  function startNew() {
    clearDraft(draftKey);
    setInvoice(newQuotation());
    setShowErrors(false);
  }

  return (
    <PageWrapper>
      <PageTitle title="Quotations" />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Quotations</h1>
          <p className="text-muted text-sm mt-1 max-w-2xl">
            Enter the items, their rates and the VAT, and the quotation is drawn up as you type. Print it or save it as a PDF.
            Quotations aren&apos;t stored on the platform — keep the PDF. The one you&apos;re working on stays in this browser until you start a new one.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6 items-start">
          <Card className="p-5 sm:p-6 flex flex-col gap-6 print:hidden">
            <section className="flex flex-col gap-4" aria-label="Quotation details">
              <SectionHeading>Quotation</SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3">
                <Input label="Quote number" name="number" required value={invoice.number} onChange={set('number')} error={errorFor('number')} maxLength={40} />
                <Input label="Date" name="issueDate" type="date" required value={invoice.issueDate} onChange={set('issueDate')} error={errorFor('issueDate')} />
                <Input label="Valid until" name="dueDate" type="date" value={invoice.dueDate} onChange={set('dueDate')} error={errorFor('dueDate')} />
              </div>
            </section>

            <section className="flex flex-col gap-4" aria-label="Prepared for">
              <SectionHeading>Prepared for</SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Name or company" name="clientName" required value={invoice.clientName} onChange={set('clientName')} error={errorFor('clientName')} maxLength={120} />
                <Input label="Email" name="clientEmail" type="email" value={invoice.clientEmail} onChange={set('clientEmail')} error={errorFor('clientEmail')} maxLength={120} />
              </div>
              <Textarea label="Address" name="clientAddress" value={invoice.clientAddress} onChange={set('clientAddress')} maxLength={300} rows={2} />
            </section>

            <section className="flex flex-col gap-4" aria-label="Items">
              <SectionHeading>Items</SectionHeading>
              <ol className="flex flex-col gap-3">
                {invoice.items.map((item, i) => (
                  <li key={i} className="rounded-xl border border-black/10 bg-black/[0.03] p-3 flex flex-col gap-3">
                    <div className="flex items-start gap-2">
                      <Input
                        label={`Item ${i + 1}`}
                        name={`items.${i}.description`}
                        required
                        placeholder="e.g. Airport transfer, Toyota Prado"
                        value={item.description}
                        onChange={setItem(i, 'description')}
                        error={errorFor(`items.${i}.description`)}
                        maxLength={200}
                        className="flex-1 min-w-0"
                      />
                      {invoice.items.length > 1 && (
                        <Button size="icon" variant="danger" onClick={() => removeItem(i)} aria-label={`Remove item ${i + 1}`} className="mt-6 shrink-0">
                          <Trash2 size={16} aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] sm:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 items-start">
                      <Input label="Quantity" name={`items.${i}.quantity`} {...NUMBER_FIELD} value={item.quantity} onChange={setItem(i, 'quantity')} error={errorFor(`items.${i}.quantity`)} />
                      <Input label="Rate (KES)" name={`items.${i}.rate`} required {...NUMBER_FIELD} value={item.rate} onChange={setItem(i, 'rate')} error={errorFor(`items.${i}.rate`)} />
                      <div className="col-span-2 sm:col-span-1 flex sm:flex-col items-center sm:items-end justify-between gap-1 sm:pt-1">
                        <span className="text-sm text-muted">Amount</span>
                        <span className="text-ink font-semibold tabular-nums sm:pt-2.5" data-testid={`item-amount-${i}`}>{formatMoney(totals.lines[i])}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              <Button size="sm" onClick={addItem} className="self-start">
                <Plus size={14} aria-hidden="true" /> Add item
              </Button>
            </section>

            <section className="flex flex-col gap-4" aria-label="Rates">
              <SectionHeading>VAT and discount</SectionHeading>
              <div className="grid grid-cols-2 gap-3">
                <Input label="VAT rate (%)" name="vatRate" {...NUMBER_FIELD} max={100} value={invoice.vatRate} onChange={set('vatRate')} error={errorFor('vatRate')} hint="16 is Kenya's standard rate; 0 for none" />
                <Input label="Discount (%)" name="discountRate" {...NUMBER_FIELD} max={100} value={invoice.discountRate} onChange={set('discountRate')} error={errorFor('discountRate')} hint="Optional" />
              </div>
              <Checkbox label="The rates already include VAT" checked={invoice.vatInclusive} onChange={set('vatInclusive')} />
            </section>

            <Textarea
              label="Notes and payment details"
              name="notes"
              value={invoice.notes}
              onChange={set('notes')}
              maxLength={1000}
              rows={3}
              hint="e.g. what's included, payment terms, or how to confirm the booking"
            />

            <div className="flex flex-col gap-3 pt-4 border-t border-black/10">
              <div className="flex items-baseline gap-6">
                <span className="text-muted text-sm">Total</span>
                <span className="font-heading text-accent text-2xl font-bold tabular-nums">{formatMoney(totals.total)}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handlePrint}>
                  <Printer size={15} aria-hidden="true" /> Print / Save as PDF
                </Button>
                <Button onClick={startNew}>
                  <FilePlus2 size={15} aria-hidden="true" /> Start a new quotation
                </Button>
              </div>
            </div>
          </Card>

          <div className="xl:sticky xl:top-24 min-w-0">
            <InvoiceDocument invoice={invoice} />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
