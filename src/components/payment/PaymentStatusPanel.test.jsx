// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

  it('still offers the payment redirect once exhausted, for a renter who was just slow to pay', () => {
    render(
      <PaymentStatusPanel
        status={undefined}
        exhausted
        onRecheck={() => {}}
        onRetry={() => {}}
        redirectUrl="https://pay.example.com/checkout?x=1"
      />
    );
    const link = screen.getByRole('link', { name: /continue to payment/i });
    expect(link).toHaveAttribute('href', 'https://pay.example.com/checkout?x=1');
    expect(screen.getByRole('button', { name: /check again/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('offers "Try Again" instead once exhausted with no redirect link to fall back to', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<PaymentStatusPanel status={undefined} exhausted onRecheck={() => {}} onRetry={onRetry} />);

    expect(screen.queryByRole('link', { name: /continue to payment/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('offers the payment link as something to click immediately, before the auto-redirect fires', () => {
    render(<PaymentStatusPanel status={undefined} exhausted={false} redirectUrl="https://pay.example.com/checkout?x=1" />);
    const link = screen.getByRole('link', { name: /continue to payment/i });
    expect(link).toHaveAttribute('href', 'https://pay.example.com/checkout?x=1');
    expect(screen.queryByText(/waiting for your payment to be confirmed/i)).not.toBeInTheDocument();
  });

  describe('auto-redirect', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('auto-navigates to the payment link a few seconds after the "ready to pay" panel shows', () => {
      const onContinue = vi.fn();
      render(
        <PaymentStatusPanel
          status={undefined}
          exhausted={false}
          redirectUrl="https://pay.example.com/checkout?x=1"
          onContinue={onContinue}
        />
      );

      expect(window.location.href).toBe('');
      act(() => vi.advanceTimersByTime(3000));

      expect(onContinue).toHaveBeenCalledTimes(1);
      expect(window.location.href).toBe('https://pay.example.com/checkout?x=1');
    });

    it('counts down the seconds visibly while waiting to auto-redirect', () => {
      render(
        <PaymentStatusPanel
          status={undefined}
          exhausted={false}
          redirectUrl="https://pay.example.com/checkout?x=1"
          onContinue={() => {}}
        />
      );

      expect(screen.getByText(/in 3s/i)).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(1000));
      expect(screen.getByText(/in 2s/i)).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(1000));
      expect(screen.getByText(/in 1s/i)).toBeInTheDocument();
    });

    it('does not auto-redirect once polling is exhausted — only a deliberate click there', () => {
      const onContinue = vi.fn();
      render(
        <PaymentStatusPanel
          status={undefined}
          exhausted
          onRecheck={() => {}}
          onRetry={() => {}}
          redirectUrl="https://pay.example.com/checkout?x=1"
          onContinue={onContinue}
        />
      );

      act(() => vi.advanceTimersByTime(10000));

      expect(onContinue).not.toHaveBeenCalled();
      expect(window.location.href).toBe('');
    });

    it('does not auto-redirect once a settled status has come back', () => {
      const onContinue = vi.fn();
      render(
        <PaymentStatusPanel
          status="SUCCESSFUL"
          exhausted={false}
          redirectUrl="https://pay.example.com/checkout?x=1"
          onContinue={onContinue}
        />
      );

      act(() => vi.advanceTimersByTime(10000));

      expect(onContinue).not.toHaveBeenCalled();
      expect(window.location.href).toBe('');
    });

    it('a manual click cancels the pending auto-redirect, so it never fires a second navigation', () => {
      const onContinue = vi.fn();
      render(
        <PaymentStatusPanel
          status={undefined}
          exhausted={false}
          redirectUrl="https://pay.example.com/checkout?x=1"
          onContinue={onContinue}
        />
      );

      fireEvent.click(screen.getByRole('link', { name: /continue to payment/i }));
      expect(onContinue).toHaveBeenCalledTimes(1);

      act(() => vi.advanceTimersByTime(10000));
      expect(onContinue).toHaveBeenCalledTimes(1);
    });
  });
});
