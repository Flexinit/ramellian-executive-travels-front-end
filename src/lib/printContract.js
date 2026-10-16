/**
 * Prints just the contract on the page (`.contract-document`), not the whole app around it: `body.printing-contract`
 * switches on the print rules in `index.css` that hide everything else, for the length of the print dialog.
 * Saving as PDF from that dialog is the download.
 */
export function printContract() {
  document.body.classList.add('printing-contract');
  const done = () => {
    document.body.classList.remove('printing-contract');
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  window.print();
}
