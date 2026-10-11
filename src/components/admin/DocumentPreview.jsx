import React from 'react';
import { FileText, Maximize2 } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { useDocumentFileUrl } from '../../hooks/useAdminDocuments';
import { DOCUMENT_TYPE_LABELS } from '../../lib/constants';

const isImage = (doc) => doc?.contentType?.startsWith('image/');
const isPdf = (doc) => doc?.contentType === 'application/pdf';

/**
 * The document itself, shown right on its card so it can be checked without opening anything:
 * an image as a picture, a PDF in a small reader, anything else as a download. Fetched with the login
 * token (the file endpoint refuses a plain link).
 *
 * @param {object} document — a `DocumentResponse`
 * @param {function} onOpen — called with the document to open it full size
 */
export function DocumentPreview({ document, onOpen }) {
  const { data: url, isError } = useDocumentFileUrl(document);
  const label = document.originalFileName || 'Uploaded document';

  if (isError) {
    return <div className="h-full min-h-40 flex items-center justify-center text-sm text-red-400 px-4 text-center">Couldn&apos;t load this file.</div>;
  }
  if (!url) {
    return (
      <div className="h-full min-h-40 flex items-center justify-center">
        <Spinner size="md" label={`Loading ${label}`} />
      </div>
    );
  }
  if (isImage(document)) {
    return (
      <button type="button" onClick={() => onOpen(document)} aria-label={`Open ${label} full size`} className="group relative block w-full h-full min-h-40 focus-ring rounded-xl">
        <img src={url} alt={label} className="w-full h-full max-h-72 object-contain rounded-xl" />
        <span className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
          <Maximize2 size={14} aria-hidden="true" />
        </span>
      </button>
    );
  }
  if (isPdf(document)) {
    return <iframe src={url} title={label} className="w-full h-72 rounded-xl bg-white" />;
  }
  return (
    <div className="h-full min-h-40 flex flex-col items-center justify-center gap-3 px-4 text-center">
      <FileText size={32} className="text-brand-grey" aria-hidden="true" />
      <Button size="sm" href={url} download={label}>
        Download {label}
      </Button>
    </div>
  );
}

/** Full-size view of a document, for a closer look at an ID or a stamp. Open while `document` is set. */
export function DocumentViewer({ document, onClose }) {
  const { data: url, isError } = useDocumentFileUrl(document || {});
  const label = document?.originalFileName || 'Uploaded document';

  return (
    <Modal isOpen={!!document} onClose={onClose} title={document ? DOCUMENT_TYPE_LABELS[document.documentType] || document.documentType : ''} size="xl">
      <div className="flex flex-col gap-3 items-center min-h-40 justify-center">
        {!url && !isError && <Spinner size="lg" label="Loading document" />}
        {isError && <p className="text-sm text-red-400">Couldn&apos;t load this file.</p>}
        {url && isImage(document) && <img src={url} alt={label} className="max-h-[75vh] max-w-full rounded-lg" />}
        {url && isPdf(document) && <iframe src={url} title={label} className="w-full h-[75vh] rounded-lg bg-white" />}
        {url && !isImage(document) && !isPdf(document) && (
          <Button href={url} download={label}>
            Download {label}
          </Button>
        )}
      </div>
    </Modal>
  );
}
