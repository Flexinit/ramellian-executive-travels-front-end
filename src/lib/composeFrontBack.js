/**
 * Combines a front and back photo into one image, stacked vertically with a labelled divider, so a
 * two-sided document (National ID, Driving Licence) can still go through the backend's one-file-per-type
 * upload (`POST /documents?documentType=…`) — its `documentType` only accepts a fixed set of values
 * (confirmed live: anything else, including e.g. `NATIONAL_ID_FRONT`, is refused with 400 "Invalid document
 * type"), so there is no way to store the two sides as separate documents today. Both sides are still
 * captured and both are visible to whoever reviews it — just as one file instead of two.
 * @param {File} frontFile
 * @param {File} backFile
 * @returns {Promise<Blob>} a JPEG blob
 */
export async function composeFrontBack(frontFile, backFile) {
  const [front, back] = await Promise.all([loadImage(frontFile), loadImage(backFile)]);
  const width = Math.max(front.width, back.width);
  const labelHeight = 28;
  const gap = 4;
  const height = labelHeight + front.height + gap + labelHeight + back.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, width, height);

  let y = drawSide(ctx, front, width, 0, labelHeight, 'FRONT');
  y += gap;
  drawSide(ctx, back, width, y, labelHeight, 'BACK');

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not combine the two photos.'))), 'image/jpeg', 0.92);
  });
}

function drawSide(ctx, img, width, top, labelHeight, label) {
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, top, width, labelHeight);
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 16px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 10, top + labelHeight / 2);
  const x = (width - img.width) / 2;
  ctx.drawImage(img, x, top + labelHeight);
  return top + labelHeight + img.height;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name} as an image.`));
    };
    img.src = url;
  });
}
