/**
 * The insurance sticker can be picked as a photo or as a PDF. The backend only stores images for a vehicle (`POST /vehicles/{id}/photos`
 * answers 400 "An image file is required" to a PDF), so a PDF is turned into a picture of its first page here, in the browser, before
 * it is uploaded. Everything downstream — the upload, the checks, the way the sticker is shown — keeps working with an image.
 */

/** The longest side, in pixels, the picture of a PDF page may have — keeps a huge page from using all the memory. */
const MAX_SIDE = 2400;

export const STICKER_ACCEPT = 'image/*,application/pdf';

export const isPdf = (file) => file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '');

/**
 * The file to upload for a picked sticker: an image is returned as it is; a PDF becomes a PNG of its first page
 * (`sticker.pdf` → `sticker.png`). Rejects if the PDF can't be read.
 *
 * @param {File} file
 * @returns {Promise<File>}
 */
export async function stickerImageFrom(file) {
  if (!isPdf(file)) return file;

  // Loaded only when a PDF is picked, so the PDF reader stays out of the pages that never need it.
  const { pdfjs } = await import('react-pdf');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  try {
    const page = await pdf.getPage(1);
    const natural = page.getViewport({ scale: 1 });
    const scale = Math.min(2, MAX_SIDE / Math.max(natural.width, natural.height));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff'; // a PDF page is transparent until painted; PNG would otherwise show black
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Could not turn the PDF into a picture.');
    return new File([blob], `${(file.name || 'sticker').replace(/\.pdf$/i, '') || 'sticker'}.png`, { type: 'image/png' });
  } finally {
    pdf.destroy();
  }
}
