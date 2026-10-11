import { useState } from 'react';
import { isPdf, stickerImageFrom } from '../lib/stickerFile';

/**
 * The insurance sticker being picked on the add and edit vehicle pages: the file to upload, why it can't be used, and the handler for
 * the file input. An image is taken as it is, straight away; a PDF is first turned into a picture of its first page (see
 * lib/stickerFile.js), which takes a moment — `stickerBusy` is true meanwhile.
 */
export function useStickerPicker() {
  const [stickerFile, setStickerFile] = useState(null);
  const [stickerError, setStickerError] = useState('');
  const [stickerBusy, setStickerBusy] = useState(false);

  async function pickSticker(e) {
    const picked = e.target.files?.[0] || null;
    e.target.value = '';
    setStickerError('');
    if (!picked || !isPdf(picked)) {
      setStickerFile(picked);
      return;
    }
    setStickerBusy(true);
    try {
      setStickerFile(await stickerImageFrom(picked));
    } catch {
      setStickerError("Couldn't read that PDF. Try another file, or a photo of the sticker.");
    } finally {
      setStickerBusy(false);
    }
  }

  return { stickerFile, setStickerFile, stickerError, setStickerError, stickerBusy, pickSticker };
}
