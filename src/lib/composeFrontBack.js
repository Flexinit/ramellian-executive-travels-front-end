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
export function composeFrontBack(frontFile, backFile) {
  return composePanels([
    { file: frontFile, label: 'FRONT' },
    { file: backFile, label: 'BACK' },
  ]);
}

// Phone cameras take 4000px-wide photos; four of those stacked would pass the canvas size iOS Safari allows.
const MAX_PANEL_WIDTH = 1600;

/**
 * Stacks several photos into one JPEG, each under its own label — e.g. an ID's front and back plus the
 * selfies holding it, sent as the one identity document the backend accepts. Each photo is scaled down to
 * at most 1600px wide.
 * @param {Array<{file: File, label: string}>} panels
 * @returns {Promise<Blob>} a JPEG blob
 */
export async function composePanels(panels) {
  const images = await Promise.all(panels.map((p) => loadImage(p.file)));
  const sizes = images.map((img) => {
    const scale = Math.min(1, MAX_PANEL_WIDTH / img.width);
    return { width: Math.round(img.width * scale), height: Math.round(img.height * scale) };
  });
  const width = Math.max(...sizes.map((s) => s.width));
  const labelHeight = 28;
  const gap = 4;
  const height = sizes.reduce((sum, s) => sum + labelHeight + s.height, 0) + gap * (panels.length - 1);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, width, height);

  let y = 0;
  images.forEach((img, i) => {
    if (i > 0) y += gap;
    y = drawPanel(ctx, img, sizes[i], width, y, labelHeight, panels[i].label);
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not combine the photos.'))), 'image/jpeg', 0.92);
  });
}

function drawPanel(ctx, img, size, width, top, labelHeight, label) {
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, top, width, labelHeight);
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 16px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 10, top + labelHeight / 2);
  const x = (width - size.width) / 2;
  ctx.drawImage(img, x, top + labelHeight, size.width, size.height);
  return top + labelHeight + size.height;
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
