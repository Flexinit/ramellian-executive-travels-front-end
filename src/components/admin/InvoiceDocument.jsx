import React from 'react';
import { formatDate } from '../../lib/utils';
import { DOCUMENT_KINDS, formatMoney, invoiceTotals, toNumber } from '../../lib/invoice';

const COMPANY_NAME = 'Ramellian Executive Travels';

/** A `YYYY-MM-DD` date input value as a local date (a bare ISO date would be read as UTC midnight). */
function localDate(value) {
  const [y, m, d] = String(value || '').split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

function Row({ label, value, strong = false }) {
  return (
    <div className={`flex items-center justify-between gap-6 py-1.5 ${strong ? 'text-slate-900 font-bold text-[15px]' : 'text-slate-600'}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums text-right">{value}</dd>
    </div>
  );
}

/**
 * The printable quotation or invoice (`invoice.kind`, see DOCUMENT_KINDS) — the same white "paper" and navy and gold letterhead as the rental contract
 * (ContractDocument), so the two documents look like they come from one company. `.invoice-document` is what
 * `printInvoice` keeps when printing (index.css); everything else on the page is hidden.
 *
 * @param {object} invoice — the form's values (see `newInvoice` in lib/invoice.js); `kind` picks the wording
 */
export default function InvoiceDocument({ invoice }) {
  const totals = invoiceTotals(invoice);
  const vatRate = toNumber(invoice.vatRate);
  const discountRate = toNumber(invoice.discountRate);
  const issued = localDate(invoice.issueDate);
  const due = localDate(invoice.dueDate);
  const quotation = invoice.kind === DOCUMENT_KINDS.QUOTATION;
  const words = quotation
    ? { title: 'Quotation', to: 'Prepared for', number: 'Quote no.', due: 'Valid until', total: 'Total' }
    : { title: 'Invoice', to: 'Billed to', number: 'Invoice no.', due: 'Due', total: 'Total due' };

  return (
    <article
      aria-label={`${words.title} preview`}
      className="invoice-document mx-auto w-full max-w-[52rem] bg-white text-slate-800 rounded-xl shadow-xl shadow-black/30 print:shadow-none print:rounded-none"
    >
      <header className="px-5 sm:px-10 pt-6 pb-5 border-b-4 border-[#C9A84C] flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#16213E] px-5 py-4">
          <div className="flex items-center gap-3">
            <img src="/brand-logo-1024-transparent.png" alt="" className="h-11 w-11 object-contain" />
            <div className="flex flex-col">
              <span className="text-[17px] font-bold tracking-[0.04em] text-[#C9A84C]">{COMPANY_NAME}</span>
              <span className="text-[11.5px] text-white/60">Nairobi, Kenya · ramellianexecutivetravels.co.ke</span>
            </div>
          </div>
          <span className="text-[22px] font-bold uppercase tracking-[0.25em] text-[#C9A84C]">{words.title}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-[13.5px]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">{words.to}</p>
            <p className="mt-1 font-semibold text-slate-900 break-words">{invoice.clientName || '—'}</p>
            {invoice.clientEmail && <p className="text-slate-600 break-all">{invoice.clientEmail}</p>}
            {invoice.clientAddress && <p className="text-slate-600 whitespace-pre-line break-words">{invoice.clientAddress}</p>}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 sm:justify-self-end content-start">
            <dt className="text-slate-400">{words.number}</dt>
            <dd className="font-semibold text-slate-900 break-all">{invoice.number || '—'}</dd>
            <dt className="text-slate-400">Date</dt>
            <dd className="font-semibold text-slate-900">{issued ? formatDate(issued) : '—'}</dd>
            {due && (
              <>
                <dt className="text-slate-400">{words.due}</dt>
                <dd className="font-semibold text-slate-900">{formatDate(due)}</dd>
              </>
            )}
          </dl>
        </div>
      </header>

      <div className="px-5 sm:px-10 py-6 flex flex-col gap-6">
        {/* Line items — the columns stay put on a phone; long descriptions wrap inside their own column. */}
        <table className="w-full table-fixed border-collapse text-[13px]">
          <colgroup>
            <col />
            <col className="w-[3.5rem] sm:w-[4.5rem]" />
            <col className="w-[6.5rem] sm:w-[8.5rem]" />
            <col className="w-[7rem] sm:w-[9rem]" />
          </colgroup>
          <thead>
            <tr className="border-b-2 border-slate-900 text-[11px] uppercase tracking-wider text-slate-500">
              <th scope="col" className="py-2 pr-2 text-left font-semibold">Description</th>
              <th scope="col" className="py-2 px-1 text-right font-semibold">Qty</th>
              <th scope="col" className="py-2 px-1 text-right font-semibold">Rate</th>
              <th scope="col" className="py-2 pl-1 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.items.map((item, i) => (
              <tr key={i} className="align-top">
                <td className="py-2.5 pr-2 text-slate-900 break-words whitespace-pre-line">{item.description || '—'}</td>
                <td className="py-2.5 px-1 text-right tabular-nums">{toNumber(item.quantity).toLocaleString('en-KE')}</td>
                <td className="py-2.5 px-1 text-right tabular-nums break-all">{formatMoney(item.rate)}</td>
                <td className="py-2.5 pl-1 text-right tabular-nums font-semibold text-slate-900 break-all">{formatMoney(totals.lines[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="w-full sm:w-80 sm:self-end text-[13.5px] break-inside-avoid">
          <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
          {discountRate > 0 && <Row label={`Discount (${discountRate}%)`} value={`− ${formatMoney(totals.discount)}`} />}
          {vatRate > 0 && (
            <Row label={invoice.vatInclusive ? `Includes VAT (${vatRate}%)` : `VAT (${vatRate}%)`} value={formatMoney(totals.vat)} />
          )}
          <div className="mt-1.5 border-t-2 border-slate-900 pt-1.5">
            <Row label={words.total} value={formatMoney(totals.total)} strong />
          </div>
        </dl>

        {invoice.notes && (
          <section className="rounded-lg bg-slate-50 border-l-4 border-[#C9A84C] px-4 py-3 text-[13px] text-slate-600 break-inside-avoid">
            <h2 className="font-semibold text-slate-900">Notes and payment details</h2>
            <p className="mt-1 whitespace-pre-line break-words">{invoice.notes}</p>
          </section>
        )}

        <p className="text-center text-[11.5px] text-slate-400">Thank you for choosing {COMPANY_NAME}.</p>
      </div>
    </article>
  );
}
