import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';

import App from './App';
import PageLoader from './components/layout/PageLoader';
import ErrorBoundary from './components/layout/ErrorBoundary';
import { queryClient } from './lib/queryClient';
import { isInsideFrame, notifyPaymentDone } from './lib/pesapalFrame';
import './index.css';

// Pesapal's callback landing inside the payment iframe (lib/pesapalFrame.js): tell the page around it the payment is
// finished, and show only a line here — never a second copy of the whole portal inside the frame.
if (isInsideFrame() && window.location.pathname.startsWith('/payment/success')) {
  notifyPaymentDone();
  document.getElementById('root').innerHTML =
    '<p style="font:14px system-ui,sans-serif;text-align:center;padding:48px 16px;color:#475569">Payment finished — checking it now…</p>';
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
            <Toaster position="top-right" />
            <PageLoader />
          </BrowserRouter>
        </QueryClientProvider>
      </HelmetProvider>
    </React.StrictMode>
  );
}
