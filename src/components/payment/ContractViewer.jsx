import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import Spinner from '../ui/Spinner';
import ErrorBanner from '../ui/ErrorBanner';

// Self-hosted from node_modules rather than a CDN, so PDF rendering doesn't
// depend on a third-party host being reachable.
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

/**
 * Renders the contract as scrollable text, or — when `pdfUrl` is given —
 * as an inline paginated PDF via react-pdf, with a download link either
 * way.
 *
 * @param {string} contractText
 * @param {string} [pdfUrl]
 */
export default function ContractViewer({ contractText, pdfUrl }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(false);

  if (pdfUrl && !pdfError) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-white/10 bg-white overflow-auto max-h-[60vh] flex justify-center">
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
              className="p-1.5 rounded-full text-brand-grey hover:text-brand-gold disabled:opacity-30 disabled:cursor-not-allowed focus-ring"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span className="text-brand-grey text-xs">
              Page {pageNumber} of {numPages || '—'}
            </span>
            <button
              type="button"
              disabled={!numPages || pageNumber >= numPages}
              onClick={() => setPageNumber((p) => p + 1)}
              aria-label="Next page"
              className="p-1.5 rounded-full text-brand-grey hover:text-brand-gold disabled:opacity-30 disabled:cursor-not-allowed focus-ring"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <a
            href={pdfUrl}
            download
            className="inline-flex items-center gap-1.5 text-brand-gold text-xs font-semibold hover:text-brand-gold-light transition-colors focus-ring rounded-md"
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

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 max-h-[60vh] overflow-y-auto">
      <pre className="whitespace-pre-wrap font-body text-sm text-brand-white leading-relaxed">{contractText}</pre>
    </div>
  );
}
