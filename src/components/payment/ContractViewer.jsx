import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { ChevronLeft, ChevronRight, Download, Printer } from 'lucide-react';
import Spinner from '../ui/Spinner';
import ErrorBanner from '../ui/ErrorBanner';
import Button from '../ui/Button';
import ContractDocument from '../contract/ContractDocument';
import { printContract } from '../../lib/printContract';

// Self-hosted from node_modules rather than a CDN, so PDF rendering doesn't
// depend on a third-party host being reachable.
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

/**
 * Shows the contract as a proper document (`ContractDocument` — letterhead, sections, details tables, and a
 * signature place for both renter and owner) with Print / Save as PDF, or — when `pdfUrl` is given — as an
 * inline paginated PDF via react-pdf with a download link.
 *
 * @param {string} contractText
 * @param {string} [pdfUrl]
 * @param {object} [document] — passed on to `ContractDocument`: `reference`, `agreementDate`, `renter`,
 *   `owner`, `signHere`
 */
export default function ContractViewer({ contractText, pdfUrl, document: doc = {} }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(false);

  if (pdfUrl && !pdfError) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-ink/10 bg-white overflow-auto max-h-[60vh] flex justify-center">
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={() => setPdfError(true)}
            loading={
              <div className="flex items-center justify-center py-16">
                <Spinner size="lg" label="Loading contract" />
              </div>
            }
          >
            <Page pageNumber={pageNumber} width={600} />
          </Document>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => p - 1)}
              aria-label="Previous page"
              className="p-1.5 rounded-full text-muted hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed focus-ring"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span className="text-muted text-xs">
              Page {pageNumber} of {numPages || '—'}
            </span>
            <button
              type="button"
              disabled={!numPages || pageNumber >= numPages}
              onClick={() => setPageNumber((p) => p + 1)}
              aria-label="Next page"
              className="p-1.5 rounded-full text-muted hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed focus-ring"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <a
            href={pdfUrl}
            download
            className="inline-flex items-center gap-1.5 text-accent text-xs font-semibold hover:text-accent-hover transition-colors focus-ring rounded-md"
          >
            <Download size={13} aria-hidden="true" />
            Download PDF
          </a>
        </div>
      </div>
    );
  }

  if (pdfUrl && pdfError) {
    return <ErrorBanner message="Could not render the contract PDF. Showing the text version instead." />;
  }

  // No scroll box of its own: the contract flows with the page, so there's only one thing to scroll. Print sits on
  // the document's own top bar, so the contract starts right under the page title.
  return (
    <ContractDocument
      contractText={contractText}
      {...doc}
      actions={
        <Button size="sm" variant="dark" onClick={printContract}>
          <Printer size={13} aria-hidden="true" /> Print / PDF
        </Button>
      }
    />
  );
}
