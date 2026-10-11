// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContractPreviewModal from './ContractPreviewModal';
import { api } from '../../lib/api';

// react-pdf needs a real canvas/worker, which jsdom doesn't provide — stubbed the same way SignaturePad
// is stubbed elsewhere (SignaturePage.test.jsx): this suite is about the fetch/loading/error states
// around the viewer, not pdf.js's own rendering. `onLoadSuccess` fires from an effect, same as the real
// Document does once it's actually finished loading (not synchronously mid-render).
vi.mock('react-pdf', () => ({
  Document: ({ children, onLoadSuccess }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => onLoadSuccess?.({ numPages: 3 }), [onLoadSuccess]);
    return <div data-testid="pdf-document">{children}</div>;
  },
  Page: ({ pageNumber }) => <div data-testid="pdf-page">Page {pageNumber}</div>,
  pdfjs: { GlobalWorkerOptions: {} },
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ContractPreviewModal', () => {
  it('fetches the contract as a blob and renders it inline, in the modal, once opened', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: new Blob(['pdf-bytes'], { type: 'application/pdf' }) });
    render(<ContractPreviewModal isOpen contractId="c1" signed label="Signed PDF" />);

    expect(await screen.findByTestId('pdf-document')).toBeInTheDocument();
    expect(screen.getByText('Page 1')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/payments/contracts/c1/document', {
      params: { signed: true },
      responseType: 'blob',
    });
  });

  it('shows the title it was given', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: new Blob(['pdf-bytes']) });
    render(<ContractPreviewModal isOpen contractId="c1" signed label="Signed PDF" />);
    expect(await screen.findByRole('heading', { name: 'Signed PDF' })).toBeInTheDocument();
  });

  it('shows an error banner, not a blank modal, if the contract fails to load', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('network'));
    render(<ContractPreviewModal isOpen contractId="c1" signed label="Signed PDF" />);

    expect(await screen.findByText(/could not load the contract/i)).toBeInTheDocument();
  });

  it('fetches nothing while closed', () => {
    const getSpy = vi.spyOn(api, 'get');
    render(<ContractPreviewModal isOpen={false} contractId="c1" signed label="Signed PDF" />);
    expect(getSpy).not.toHaveBeenCalled();
  });
});
