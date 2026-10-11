import React, { useState } from 'react';
import { DocumentPreview, DocumentViewer } from '../admin/DocumentPreview';

/**
 * The uploaded file itself — an inline thumbnail that opens full size — shared between
 * `DocumentUploadCard` and `TwoSidedDocumentUploadCard` so a renter sees the same confirmation of what
 * they actually sent in that an administrator reviewing it sees. Renders nothing before anything's
 * uploaded.
 * @param {{id: string, contentType?: string}} [document]
 */
export default function DocumentFilePreview({ document }) {
  const [viewing, setViewing] = useState(false);
  if (!document?.id) return null;

  return (
    <>
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <DocumentPreview document={document} onOpen={() => setViewing(true)} />
      </div>
      {viewing && <DocumentViewer document={document} onClose={() => setViewing(false)} />}
    </>
  );
}
