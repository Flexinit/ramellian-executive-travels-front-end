import React, { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

/**
 * Whether this device should take a photo through the browser's own camera window (`WebcamCapture`) rather than
 * the file input's `capture` hint: a computer (fine pointer) with a camera API. Phones and tablets are left to their
 * own camera app, which `capture="user"` opens and which works better there; laptops ignore `capture` and only offer
 * a file browser, so a selfie couldn't be taken on them at all.
 */
export function prefersWebcamWindow() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const hasCamera = !!navigator.mediaDevices?.getUserMedia;
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return hasCamera && !coarse;
}

/**
 * A window that takes a photo with the computer's camera — used for the selfie holding an ID or passport. It shows a
 * live preview (mirrored, the way people expect to see themselves), "Take photo" freezes it, and the person can
 * retake or use it. The photo handed back is NOT mirrored, so the writing on the ID being held up reads the right way
 * round. The camera is switched off as soon as the window closes. If there's no camera, or the person blocks it, it
 * says so and suggests uploading a photo instead.
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {(file: File) => void} onCapture — gets a JPEG File
 * @param {string} [title]
 * @param {string} [hint] — a line under the preview, e.g. "Hold your ID next to your face, photo side to the camera"
 */
export default function WebcamCapture({ isOpen, onClose, onCapture, title = 'Take a selfie', hint }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [shot, setShot] = useState(null); // { url, blob }

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    setError(null);
    setShot(null);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err?.name === 'NotAllowedError'
            ? 'Camera access was blocked. Allow the camera for this site in your browser (the camera icon in the address bar), or upload a photo instead.'
            : "We couldn't find a camera on this computer. Upload a photo instead."
        );
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => () => shot && URL.revokeObjectURL(shot.url), [shot]);

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => blob && setShot({ blob, url: URL.createObjectURL(blob) }), 'image/jpeg', 0.92);
  }

  function acceptPhoto() {
    onCapture(new File([shot.blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="flex flex-col gap-4">
        {error ? (
          <p role="alert" className="rounded-tile bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : (
          <div className="relative aspect-[4/3] overflow-hidden rounded-tile bg-overlay">
            {shot ? (
              <img src={shot.url} alt="Your photo" className="h-full w-full object-cover" />
            ) : (
              <video
                ref={(el) => {
                  // A fresh element after Retake: hand it the running camera stream again.
                  videoRef.current = el;
                  if (el && streamRef.current && el.srcObject !== streamRef.current) el.srcObject = streamRef.current;
                }}
                autoPlay
                playsInline
                muted
                aria-label="Camera preview"
                className="h-full w-full object-cover -scale-x-100"
              />
            )}
          </div>
        )}
        {hint && !error && <p className="text-sm text-muted">{hint}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          {error ? (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          ) : shot ? (
            <>
              <Button variant="outline" onClick={() => setShot(null)}>
                <RotateCcw size={15} aria-hidden="true" /> Retake
              </Button>
              <Button onClick={acceptPhoto}>Use this photo</Button>
            </>
          ) : (
            <Button onClick={takePhoto}>
              <Camera size={15} aria-hidden="true" /> Take photo
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
