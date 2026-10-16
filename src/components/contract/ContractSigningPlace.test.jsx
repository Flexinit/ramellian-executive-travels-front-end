// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import ContractSigningPlace from './ContractSigningPlace';

vi.mock('../payment/SignaturePad', () => ({
  default: ({ onChange }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => onChange?.('data:image/png;base64,aGk='), [onChange]);
    return <div data-testid="pad" />;
  },
}));

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;
const renderIt = (props) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ContractSigningPlace {...props} />
    </QueryClientProvider>
  );

describe('ContractSigningPlace', () => {
  it('offers one-click signing with the saved signature when there is one', async () => {
    const user = userEvent.setup();
    const onSign = vi.fn();
    server.use(
      http.get(`${BASE}/profile/signature`, () => HttpResponse.json({ hasSavedSignature: true })),
      http.get(`${BASE}/profile/signature/image`, () => new HttpResponse(new Blob(['x'], { type: 'image/png' })))
    );
    renderIt({ onSign });

    await user.click(await screen.findByRole('button', { name: /sign with my saved signature/i }));
    expect(onSign).toHaveBeenCalledWith({ useSaved: true });
  });

  it('otherwise asks for a drawn signature, and can keep it for next time', async () => {
    const user = userEvent.setup();
    const onSign = vi.fn();
    server.use(http.get(`${BASE}/profile/signature`, () => HttpResponse.json({ hasSavedSignature: false })));
    renderIt({ onSign, offerSave: true });

    await user.click(await screen.findByLabelText(/save this signature/i));
    await user.click(screen.getByRole('button', { name: /submit signature/i }));
    expect(onSign).toHaveBeenCalledWith({ signature: 'data:image/png;base64,aGk=', useSaved: false, saveAsProfile: true });
  });
});
