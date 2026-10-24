/**
 * Prints one document on the page, not the whole app around it: the body class switches on the print rules in
 * `index.css` that hide everything else, for the length of the print dialog. Saving as PDF from that dialog is the
 * download.
 */
function printOnly(bodyClass) {
  document.body.classList.add(bodyClass);
  const done = () => {
    document.body.classList.remove(bodyClass);
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  window.print();
}

/** Prints just the contract (`.contract-document`). */
export function printContract() {
  printOnly('printing-contract');
}

/** Prints just the quotation or invoice (`.invoice-document`, AdminQuotationPage). */
export function printInvoice() {
  printOnly('printing-invoice');
}
