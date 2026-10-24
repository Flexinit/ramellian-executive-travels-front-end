import React, { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import ErrorBanner from '../ui/ErrorBanner';
import { downloadContract, fetchContractBlob } from '../../lib/contracts';

// Self-hosted from node_modules rather than a CDN, same reasoning as ContractViewer.jsx — pdf.js's own
// worker doesn't depend on a third-party host being reachable. Harmless to set again if ContractViewer
// already did; pdfjs just keeps the last value.
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

/**
 * Previews a contract's PDF inline, in a modal — not a new browser tab, which is what this replaced:
 * a renter wants to actually read the contract without leaving the portal or fighting a pop-up blocker.
 * Reuses the same paginated react-pdf viewer `ContractViewer` already shows during signing, fed the PDF
 * as a `Blob` (via `fetchContractBlob`'s authenticated fetch) rather than a bare URL, since the document
 * endpoint needs the JWT bearer header a URL string handed to react-pdf can't carry.
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {string} contractId
 * @param {boolean} signed — the signed copy vs. the original unsigned one
 * @param {string} label — e.g. "Signed PDF", shown as the modal's title
 */
export default function ContractPreviewModal({ isOpen, onClose, contractId, signed, label }) {
  const [blob, setBlob] = useState(null);
  const [error, setError] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    if (!isOpen) return;
    setBlob(null);
    setError(false);
    setNumPages(null);
    setPageNumber(1);
    fetchContractBlob(contractId, signed)
      .then(setBlob)
      .catch(() => setError(true));
  }, [isOpen, contractId, signed]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={label} size="xl">
      {error ? (
        <ErrorBanner message="Could not load the contract." />
      ) : !blob ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Loading contract" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-ink/10 bg-white overflow-auto max-h-[70vh] flex justify-center">
            <Document
              file={blob}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              onLoadError={() => setError(true)}
              loading={
                <div className="flex items-center justify-center py-16">
                  <Spinner size="lg" label="Rendering contract" />
                </div>
              }
            >
              <Page pageNumber={pageNumber} width={680} />
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
            <button
              type="button"
              onClick={() => downloadContract(contractId, signed)}
              className="inline-flex items-center gap-1.5 text-accent text-xs font-semibold hover:text-accent-hover transition-colors focus-ring rounded-md"
            >
              <Download size={13} aria-hidden="true" />
              Download PDF
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
