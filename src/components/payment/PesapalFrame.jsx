import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { isPaymentDoneMessage } from '../../lib/pesapalFrame';

/**
 * Pesapal's payment page inside the portal (see lib/pesapalFrame.js): the renter pays without leaving the page. When
 * Pesapal finishes, its callback inside the frame tells this page (`onDone`), which then checks the payment's status.
 * If that message never comes (e.g. a payment method that finishes in the M-Pesa app), **I've finished paying** does
 * the same; **Open the payment page instead** is the old full-page way, for a browser that won't show the frame.
 *
 * @param {string} url — the Pesapal checkout URL (`redirectUrl` from the checkout)
 * @param {function} onDone — the payment is finished (or the renter says so): start checking its status
 * @param {string} [title]
 */
export default function PesapalFrame({ url, onDone, title = 'Pesapal secure payment' }) {
  const [loaded, setLoaded] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    setLoaded(false);
    function onMessage(event) {
      if (isPaymentDoneMessage(event)) onDoneRef.current?.();
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [url]);

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="relative w-full overflow-hidden rounded-tile border border-line bg-white">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size="lg" label="Loading the secure payment page" />
          </div>
        )}
        <iframe
          key={url}
          src={url}
          title={title}
          onLoad={() => setLoaded(true)}
          allow="payment"
          // Pesapal's page may try to take over the whole tab ("frame-busting"); without top navigation in the sandbox it
          // can't, so the renter stays on our page. Scripts, forms, popups (card checks) and its own site still work.
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals"
          className="block w-full h-[640px] sm:h-[700px] border-0"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a
          href={url}
          onClick={() => onDoneRef.current?.()}
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline focus-ring rounded"
        >
          <ExternalLink size={14} aria-hidden="true" /> Open the payment page instead
        </a>
        <Button size="sm" variant="outline" onClick={() => onDoneRef.current?.()}>
          <CheckCircle2 size={14} aria-hidden="true" /> I&apos;ve finished paying
        </Button>
      </div>
    </div>
  );
}
