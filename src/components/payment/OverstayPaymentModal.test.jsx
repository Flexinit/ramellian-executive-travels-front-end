// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import OverstayPaymentModal from './OverstayPaymentModal';
import { isPaymentDoneMessage, notifyPaymentDone, PESAPAL_DONE } from '../../lib/pesapalFrame';

beforeEach(() => {
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});

describe('paying an overstay in a dialog', () => {
  it("shows Pesapal's page in the dialog, and closes with a thank-you once the frame says it's finished", async () => {
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Toaster />
        <OverstayPaymentModal url="https://pay.pesapal.com/overstay?b=b1" booking={{ id: 'b1', overstayAmount: 3000 }} onClose={onClose} />
      </QueryClientProvider>
    );
    expect(screen.getByRole('dialog', { name: 'Pay overstay KES 3,000' })).toBeInTheDocument();
    expect(screen.getByTitle('Pesapal secure payment')).toHaveAttribute('src', 'https://pay.pesapal.com/overstay?b=b1');

    act(() => { window.dispatchEvent(new MessageEvent('message', { origin: window.location.origin, data: { type: PESAPAL_DONE } })); });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/your overstay payment is being confirmed/i)).toBeInTheDocument();
  });
});

describe("Pesapal's callback inside the frame", () => {
  it('tells only this same site that the payment is finished', () => {
    const post = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    notifyPaymentDone('?OrderTrackingId=abc');
    expect(post).toHaveBeenCalledWith({ type: PESAPAL_DONE, search: '?OrderTrackingId=abc' }, window.location.origin);
    post.mockRestore();
  });

  it('ignores the same message from another site', () => {
    expect(isPaymentDoneMessage({ origin: window.location.origin, data: { type: PESAPAL_DONE } })).toBe(true);
    expect(isPaymentDoneMessage({ origin: 'https://evil.example', data: { type: PESAPAL_DONE } })).toBe(false);
    expect(isPaymentDoneMessage({ origin: window.location.origin, data: { type: 'other' } })).toBe(false);
  });
});
