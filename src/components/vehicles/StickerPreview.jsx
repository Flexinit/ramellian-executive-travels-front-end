import React, { useEffect, useState } from 'react';

/**
 * A small picture of the insurance sticker that was just picked, so the person can check it is the right one and readable before
 * saving. For a PDF it is the first page (the file passed in is already that picture). Click it to open it full size in a new tab.
 *
 * @param {File} file — the image that will be uploaded
 */
export default function StickerPreview({ file }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return undefined;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL?.(objectUrl);
  }, [file]);

  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" aria-label="Open the insurance sticker preview full size" className="self-start rounded-lg focus-ring">
      <img src={url} alt="Insurance sticker preview" className="h-32 w-auto max-w-full rounded-lg border border-ink/10 bg-white object-contain" />
    </a>
  );
}
