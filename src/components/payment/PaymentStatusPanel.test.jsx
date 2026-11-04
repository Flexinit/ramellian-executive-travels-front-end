// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentStatusPanel from './PaymentStatusPanel';

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, href: '' },
  });
});

describe('PaymentStatusPanel', () => {
  it('shows a plain waiting spinner while still polling', () => {
    render(<PaymentStatusPanel status={undefined} exhausted={false} />);
    expect(screen.getByText(/waiting for your payment to be confirmed/i)).toBeInTheDocument();
    expect(screen.queryByText(/still confirming your payment/i)).not.toBeInTheDocument();
  });

  it('shows success once the status settles', () => {
    render(<PaymentStatusPanel status="SUCCESSFUL" exhausted={false} />);
    expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
  });

  it('offers a retry when payment failed', () => {
    render(<PaymentStatusPanel status="FAILED" onRetry={() => {}} />);
    expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('disables "Try Again" while a retry is already in flight, so a double-click can\'t start two checkouts', () => {
    render(<PaymentStatusPanel status="FAILED" onRetry={() => {}} retrying />);
    expect(screen.getByRole('button', { name: /try again/i })).toBeDisabled();
  });

  it('tells the renter polling gave up, distinctly from "still checking", once exhausted', () => {
    render(<PaymentStatusPanel status={undefined} exhausted onRecheck={() => {}} />);
    expect(screen.getByText(/still confirming your payment/i)).toBeInTheDocument();
    expect(screen.queryByText(/waiting for your payment to be confirmed…/i)).not.toBeInTheDocument();
  });

  it('lets the renter manually check again once exhausted, without starting a new checkout', async () => {
    const user = userEvent.setup();
    const onRecheck = vi.fn();
    const onRetry = vi.fn();
    render(<PaymentStatusPanel status={undefined} exhausted onRecheck={onRecheck} onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: /check again/i }));

    expect(onRecheck).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('never shows the exhausted message once a settled status has come back', () => {
    render(<PaymentStatusPanel status="SUCCESSFUL" exhausted onRecheck={() => {}} />);
    expect(screen.queryByText(/still confirming your payment/i)).not.toBeInTheDocument();
    expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
  });

  it('once exhausted, Continue to Payment opens the payment frame again, for a renter who was just slow to pay', async () => {
    const user = userEvent.setup();
    const onRecheck = vi.fn();
    const onContinue = vi.fn();
    render(
      <PaymentStatusPanel
        status={undefined}
        exhausted
        onRecheck={onRecheck}
        onRetry={() => {}}
        onContinue={onContinue}
        redirectUrl="https://pay.example.com/checkout?x=1"
      />
    );
    expect(screen.getByRole('button', { name: /check again/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continue to payment/i }));
    expect(screen.getByTitle('Pesapal secure payment')).toHaveAttribute('src', 'https://pay.example.com/checkout?x=1');

    // Finished: polling had given up, so it's asked again.
    await user.click(screen.getByRole('button', { name: /i've finished paying/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onRecheck).toHaveBeenCalledTimes(1);
  });

  it('offers "Try Again" instead once exhausted with no redirect link to fall back to', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<PaymentStatusPanel status={undefined} exhausted onRecheck={() => {}} onRetry={onRetry} />);

    expect(screen.queryByRole('link', { name: /continue to payment/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  describe('paying in a frame on the page', () => {
    it("shows Pesapal's page right here — the browser doesn't leave the site", () => {
      render(<PaymentStatusPanel status={undefined} exhausted={false} redirectUrl="https://pay.example.com/checkout?x=1" />);
      expect(screen.getByTitle('Pesapal secure payment')).toHaveAttribute('src', 'https://pay.example.com/checkout?x=1');
      expect(screen.queryByText(/waiting for your payment to be confirmed/i)).not.toBeInTheDocument();
      expect(window.location.href).toBe('');
    });

    it("starts checking the status when Pesapal's callback inside the frame says it's finished", () => {
      const onContinue = vi.fn();
      render(<PaymentStatusPanel status={undefined} exhausted={false} redirectUrl="https://pay.example.com/checkout?x=1" onContinue={onContinue} />);

      // From another site: ignored.
      act(() => { window.dispatchEvent(new MessageEvent('message', { origin: 'https://evil.example', data: { type: 'ramellian:pesapal-done' } })); });
      expect(onContinue).not.toHaveBeenCalled();

      act(() => { window.dispatchEvent(new MessageEvent('message', { origin: window.location.origin, data: { type: 'ramellian:pesapal-done' } })); });
      expect(onContinue).toHaveBeenCalledTimes(1);
      expect(screen.queryByTitle('Pesapal secure payment')).not.toBeInTheDocument();
      expect(screen.getByText(/waiting for your payment to be confirmed/i)).toBeInTheDocument();
    });

    it("I've finished paying does the same, if the callback never says so", async () => {
      const user = userEvent.setup();
      const onContinue = vi.fn();
      render(<PaymentStatusPanel status={undefined} exhausted={false} redirectUrl="https://pay.example.com/checkout?x=1" onContinue={onContinue} />);
      await user.click(screen.getByRole('button', { name: /i've finished paying/i }));
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('keeps the full-page way as a fallback link', () => {
      render(<PaymentStatusPanel status={undefined} exhausted={false} redirectUrl="https://pay.example.com/checkout?x=1" />);
      expect(screen.getByRole('link', { name: /open the payment page instead/i })).toHaveAttribute('href', 'https://pay.example.com/checkout?x=1');
    });

    it('shows a fresh frame for a new payment link (Try Again)', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<PaymentStatusPanel status={undefined} exhausted={false} redirectUrl="https://pay.example.com/one" onContinue={() => {}} />);
      await user.click(screen.getByRole('button', { name: /i've finished paying/i }));
      expect(screen.queryByTitle('Pesapal secure payment')).not.toBeInTheDocument();
      rerender(<PaymentStatusPanel status={undefined} exhausted={false} redirectUrl="https://pay.example.com/two" onContinue={() => {}} />);
      expect(screen.getByTitle('Pesapal secure payment')).toHaveAttribute('src', 'https://pay.example.com/two');
    });

    it('shows no frame once a settled status has come back', () => {
      render(<PaymentStatusPanel status="SUCCESSFUL" exhausted={false} redirectUrl="https://pay.example.com/checkout?x=1" />);
      expect(screen.queryByTitle('Pesapal secure payment')).not.toBeInTheDocument();
    });
  });
});
