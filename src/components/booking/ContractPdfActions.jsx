import React, { useState } from 'react';
import { Eye, Download } from 'lucide-react';
import { downloadContract } from '../../lib/contracts';
import ContractPreviewModal from './ContractPreviewModal';

/**
 * Preview + Download for one contract PDF (signed or unsigned) — a renter wants to actually look at the
 * contract first, not just save a copy of it, so Preview (opens inline, in a modal — not a new browser
 * tab) is the labelled, primary action here, with a small icon-only Download next to it for the explicit
 * "keep a copy" case. Shared across every place a contract's PDF is offered — BookingDetailPage,
 * BookingRow's expanded detail panel, and its Contract column — so this stays consistent everywhere
 * rather than only where it was first asked for.
 *
 * @param {string} contractId
 * @param {boolean} signed — the signed copy vs. the original unsigned one
 * @param {string} label — e.g. "Signed PDF"
 */
export default function ContractPdfActions({ contractId, signed, label }) {
  const [previewing, setPreviewing] = useState(false);

  return (
    <>
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPreviewing(true);
          }}
          className="inline-flex items-center gap-1.5 text-brand-gold text-sm font-semibold hover:text-brand-gold-light transition-colors focus-ring rounded-md"
        >
          <Eye size={14} aria-hidden="true" />
          {label}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            downloadContract(contractId, signed);
          }}
          aria-label={`Download ${label}`}
          className="p-1.5 text-brand-grey hover:text-brand-white transition-colors focus-ring rounded-md"
        >
          <Download size={14} aria-hidden="true" />
        </button>
      </div>

      <ContractPreviewModal
        isOpen={previewing}
        onClose={() => setPreviewing(false)}
        contractId={contractId}
        signed={signed}
        label={label}
      />
    </>
  );
}
