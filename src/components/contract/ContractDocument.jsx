import React, { useEffect, useRef, useState } from 'react';
import { Clock, ShieldCheck, ArrowLeft, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import { parseContract, inlineRuns, contractStages, onlyAvailable } from '../../lib/contractDocument';
import { formatDateTime } from '../../lib/utils';

export const COMPANY_NAME = 'Ramellian Executive Travels';

/** Inline text: bold / italic, and a quiet "Not provided" for a detail nobody has filled in. */
function Inline({ text }) {
  return inlineRuns(text).map((run, i) => {
    if (run.kind === 'bold') return <strong key={i} className="font-semibold text-slate-900">{run.text}</strong>;
    if (run.kind === 'italic') return <em key={i}>{run.text}</em>;
    if (run.kind === 'blank') return <span key={i} className="italic text-slate-400">not provided</span>;
    return <React.Fragment key={i}>{run.text}</React.Fragment>;
  });
}

/** Label / value pairs (only the filled-in ones reach here — see `onlyAvailable`). */
function Details({ rows }) {
  const filled = rows;
  return (
    <dl className="grid grid-cols-[minmax(9rem,36%)_1fr] gap-x-4 text-[15px]">
      {filled.map((row, i) => (
        <React.Fragment key={`${row.label}-${i}`}>
          <dt className="py-2 border-b border-slate-100 text-slate-500"><Inline text={row.label} /></dt>
          <dd className="py-2 border-b border-slate-100 font-medium text-slate-900 break-words"><Inline text={row.value} /></dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

function Block({ block }) {
  switch (block.type) {
    case 'heading':
      return block.level <= 2 ? (
        <h2 className="mt-5 text-[17px] font-bold text-slate-900"><Inline text={block.text} /></h2>
      ) : (
        <h3 className="mt-2 text-[15px] font-semibold text-slate-900"><Inline text={block.text} /></h3>
      );
    case 'subheading':
      return <h3 className="mt-2 text-[13.5px] font-semibold uppercase tracking-wider text-slate-500"><Inline text={block.text} /></h3>;
    case 'details':
      return <Details rows={block.rows} />;
    case 'clause':
      return (
        <p className="grid grid-cols-[3rem_1fr] text-[15px] leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-900 tabular-nums">{block.number}</span>
          <span><Inline text={block.text} /></span>
        </p>
      );
    case 'bullets':
      return (
        <ul className="flex flex-col gap-0.5 pl-5 list-disc marker:text-slate-400 text-[15px] leading-relaxed text-slate-700">
          {block.items.map((item, i) => <li key={i}><Inline text={item} /></li>)}
        </ul>
      );
    case 'numbered':
      return (
        <ol className="flex flex-col gap-0.5 pl-6 list-[lower-alpha] marker:text-slate-500 text-[15px] leading-relaxed text-slate-700">
          {block.items.map((item, i) => <li key={i}><Inline text={item} /></li>)}
        </ol>
      );
    case 'rule':
      return <hr className="my-3 border-slate-200" />;
    default:
      return <p className="text-[15px] leading-relaxed text-slate-700"><Inline text={block.text} /></p>;
  }
}

/** One party's signing place: name, signature, and the date it was signed — or what's still to happen. */
function SignatureBox({ role, name, signedAt, children }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 break-inside-avoid">
      <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-slate-500">{role}</p>
      <p className="text-sm font-semibold text-slate-900">{name || <span className="italic font-normal text-slate-400">Name to be confirmed</span>}</p>
      {signedAt ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[15px] font-semibold text-emerald-700">
          <ShieldCheck size={15} aria-hidden="true" /> Signed electronically
        </p>
      ) : children ? (
        children
      ) : (
        <div className="mt-2 h-12 border-b-2 border-dashed border-slate-300 flex items-end pb-1">
          <span className="inline-flex items-center gap-1.5 text-[15px] text-slate-400">
            <Clock size={14} aria-hidden="true" /> Awaiting signature
          </span>
        </div>
      )}
      <p className="text-[14px] text-slate-900">
        <span className="text-slate-500">Date signed: </span>
        {signedAt ? formatDateTime(signedAt) : <span className="text-slate-400">not yet signed</span>}
      </p>
    </div>
  );
}

/**
 * A rental contract laid out as a document: the company's letterhead, the agreement's reference and date, its
 * sections and clauses, and a signature section where **both** the renter and the owner sign, each dated. It reads
 * whatever template the owner wrote (`parseContract`), already filled with the booking's details
 * (`useFilledContract`); nothing is shown as Markdown. Details nobody has filled in are left out to keep it short.
 * It flows with the page (no scroll box of its own) and prints cleanly.
 *
 * Each party signs on the platform (live spec 2026-10-16): the renter with `POST /payments/contracts/{id}/sign`, the
 * owner with `.../owner-sign` — drawn, or with their saved signature — and the contract records `renterSignedAt` /
 * `renterSignedBy` and `ownerSignedAt` / `ownerSignedBy`. A place not signed yet shows "Awaiting signature".
 *
 * @param {string} contractText — the filled contract text
 * @param {string} [reference] — the booking reference
 * @param {string|Date} [agreementDate] — when the agreement was made (accepted)
 * @param {{ name?: string, signedAt?: string }} [renter]
 * @param {{ name?: string, signedAt?: string }} [owner]
 * @param {React.ReactNode} [renterSigning] — shown in the renter's place while unsigned (the signature pad, on
 *   the signing page)
 * @param {React.ReactNode} [ownerSigning] — shown in the owner's place while unsigned (on the owner's side)
 * @param {string} [signaturesId] — id of the Signatures section, to scroll to it
 * @param {boolean} [staged] — read it in short parts, one at a time, with Back / Next; the signatures are the last
 *   part. Printing still prints all of it.
 * @param {function} [onProgress] — staged only: called with `{ part, parts, atEnd }` whenever the part changes
 * @param {React.ReactNode} [actions] — small actions (e.g. Print) shown on the document's own top bar
 */
export default function ContractDocument({ contractText, reference, agreementDate, renter = {}, owner = {}, renterSigning, ownerSigning, signaturesId, staged = false, onProgress, actions }) {
  const { title, preamble, blocks: allBlocks } = parseContract(contractText);
  // The template's own "Agreement reference / Date of agreement" table repeats the letterhead — left out.
  const first = allBlocks[0];
  const repeatsLetterhead = first?.type === 'details' && first.rows.every((r) => /reference|date/i.test(r.label));
  // Only what's actually known: blanks, empty rows and sections with nothing in them are left out.
  const blocks = onlyAvailable(repeatsLetterhead ? allBlocks.slice(1) : allBlocks);

  const stages = staged ? [...contractStages(blocks), { title: 'Signatures', blocks: [], signatures: true }] : [{ blocks, signatures: true }];
  const [part, setPart] = useState(0);
  const at = Math.min(part, stages.length - 1);
  const atEnd = at === stages.length - 1;
  const topRef = useRef(null);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  useEffect(() => {
    if (staged) onProgressRef.current?.({ part: at, parts: stages.length, atEnd });
  }, [staged, at, stages.length, atEnd]);

  function go(next) {
    setPart(next);
    topRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  return (
    <article
      ref={topRef}
      aria-label="Rental contract"
      className="contract-document mx-auto w-full max-w-[64rem] bg-white text-slate-800 rounded-xl shadow-xl shadow-black/30 print:shadow-none print:rounded-none scroll-mt-24"
    >
      {/* Letterhead — the dark brand band with the logo and the company's full name. */}
      <header className="px-6 sm:px-10 pt-6 pb-4 border-b-4 border-[#C9A84C] flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#1A1A2E] px-5 py-4">
          <div className="flex items-center gap-3">
            <img src="/brand-logo-1024-transparent.png" alt="" className="h-11 w-11 object-contain" />
            <div className="flex flex-col">
              <span className="text-[17px] font-bold tracking-[0.04em] text-[#C9A84C]">{COMPANY_NAME}</span>
              <span className="text-[11.5px] text-white/60">Nairobi, Kenya · ramellianexecutivetravels.co.ke</span>
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C9A84C]">Rental Agreement</span>
        </div>
        <div className="text-center">
          <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight text-slate-900">{title || 'Vehicle Rental Agreement'}</h1>
          <dl className="mt-1 flex flex-wrap justify-center gap-x-6 gap-y-0.5 text-[13px] text-slate-500">
            {reference && (
              <div className="flex gap-1.5"><dt>Reference</dt><dd className="font-semibold text-slate-800 break-all">{reference}</dd></div>
            )}
            {agreementDate && (
              <div className="flex gap-1.5"><dt>Dated</dt><dd className="font-semibold text-slate-800">{formatDateTime(agreementDate)}</dd></div>
            )}
          </dl>
        </div>
      </header>

      {(staged || actions) && (
        <div className="px-6 sm:px-10 pt-4 print:hidden">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-900">{staged ? stages[at].title : ''}</span>
            <div className="flex items-center gap-3">
              {staged && <span className="text-slate-500 tabular-nums">Part {at + 1} of {stages.length}</span>}
              {actions}
            </div>
          </div>
          {staged && (
          <div className="mt-2 flex gap-1" aria-hidden="true">
            {stages.map((_, i) => (
              <span key={i} className={`h-1 flex-1 rounded-full ${i <= at ? 'bg-[#C9A84C]' : 'bg-slate-200'}`} />
            ))}
          </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2.5 px-6 sm:px-10 py-6">
        {/* The platform notice opens the agreement (the first part, when read in parts). */}
        {preamble.length > 0 && (
          <aside className={`rounded-lg bg-slate-50 border-l-4 border-[#C9A84C] px-4 py-3 mb-1 text-[14px] leading-relaxed text-slate-600 break-inside-avoid ${at === 0 ? '' : 'hidden print:block'}`}>
            {preamble
              .filter((b) => b.type !== 'heading')
              .map((block, i) => <p key={i}><Inline text={block.text || ''} /></p>)}
          </aside>
        )}

        {/* Every part is rendered, so printing gets the whole contract; on screen only the current one shows. */}
        {stages.map((stage, i) => (
          <div key={i} className={`flex flex-col gap-2.5 ${i === at ? '' : 'hidden print:flex'}`}>
            {stage.blocks.map((block, j) => <Block key={j} block={block} />)}
            {stage.signatures && (
              // Signatures — always here, whatever the template says, so both parties have a clear place to sign.
              <section id={signaturesId} aria-label="Signatures" className="mt-6 pt-4 border-t-2 border-slate-900 break-inside-avoid scroll-mt-24">
                <h2 className="text-[17px] font-bold text-slate-900">Signatures</h2>
                <p className="mt-0.5 text-[13.5px] text-slate-500">Both parties sign electronically on the platform. Each signature is dated when it is made.</p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SignatureBox role="Renter" name={renter.name} signedAt={renter.signedAt}>{renterSigning}</SignatureBox>
                  <SignatureBox role="Owner" name={owner.name} signedAt={owner.signedAt}>{ownerSigning}</SignatureBox>
                </div>
              </section>
            )}
          </div>
        ))}

        {staged && (
          // Kept at the bottom of the screen while reading a part, so Next never needs scrolling to.
          <div className={`mt-4 -mx-6 sm:-mx-10 px-6 sm:px-10 py-3 flex items-center justify-between gap-3 bg-white border-t border-slate-200 print:hidden ${atEnd ? '' : 'sticky bottom-0 z-10 rounded-b-xl shadow-[0_-8px_16px_-12px_rgba(0,0,0,0.25)]'}`}>
            {at > 0 ? (
              <Button variant="dark" onClick={() => go(at - 1)}>
                <ArrowLeft size={14} aria-hidden="true" /> Back
              </Button>
            ) : <span />}
            {!atEnd && (
              <div className="flex items-center gap-3 min-w-0">
                <span className="hidden sm:block truncate text-[13px] text-slate-500">Up next: {stages[at + 1].title}</span>
                <Button variant="navy" onClick={() => go(at + 1)} className="shrink-0">
                  Next <ArrowRight size={14} aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="px-6 sm:px-10 py-2.5 border-t border-slate-100 text-[11.5px] text-slate-400 flex flex-wrap justify-between gap-2">
        <span>{COMPANY_NAME} · Vehicle Rental Agreement</span>
        <span>Generated {formatDateTime(new Date())}</span>
      </footer>
    </article>
  );
}
