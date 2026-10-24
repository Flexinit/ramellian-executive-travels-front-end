import React from 'react';
import { CircleCheck, CircleHelp, Copy, ExternalLink, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthImage from '../vehicles/AuthImage';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { useStickerScan } from '../../hooks/useStickerScan';
import { describeQrPayload, qrMentionsRegistration } from '../../lib/qrScan';

/**
 * Reviewing a vehicle's insurance sticker: the photo, and — read automatically from it — the QR code on it.
 *
 * What the automatic part can and can't say: it says whether the photo has a readable QR, what the QR contains, and
 * whether the vehicle's registration number appears in it. It cannot say the insurance is valid — Kenya's
 * verifier (Association of Kenya Insurers) does that — so a found QR is presented as the thing to check there,
 * with a link when the QR itself is a web address.
 *
 * @param {object} vehicle — needs `model`, `registrationNumber`, `insuranceVerificationStickerPhoto`
 */
export default function InsuranceStickerReview({ vehicle }) {
  const src = vehicle.insuranceVerificationStickerPhoto;
  const { data: payload, isLoading } = useStickerScan(src);
  const found = payload ? describeQrPayload(payload) : null;
  const hasRegistration = found ? qrMentionsRegistration(found.text, vehicle.registrationNumber) : false;

  async function copy() {
    try {
      await navigator.clipboard.writeText(found.text);
      toast.success('Copied.');
    } catch {
      toast.error("Couldn't copy — select the text instead.");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <AuthImage
        src={src}
        alt={`Insurance sticker for ${vehicle.model}`}
        className="max-h-[70vh] max-w-full mx-auto rounded-lg"
        fallback={<p className="text-sm text-red-600 text-center">Couldn&apos;t load the sticker photo.</p>}
      />

      <section aria-label="QR code check" className="flex flex-col gap-4 min-w-0">
        <h3 className="flex items-center gap-2 font-heading text-ink text-base font-semibold">
          <QrCode size={17} className="text-accent" aria-hidden="true" />
          QR code check
        </h3>

        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted" role="status">
            <Spinner size="sm" label="Reading the QR code" />
            Reading the QR code…
          </p>
        )}

        {!isLoading && !found && (
          <div className="flex flex-col gap-2">
            <Badge label="No QR code found" variant="warning" className="self-start" />
            <p className="text-sm text-muted">
              A digital certificate should have a QR code. This photo has none that could be read — it may be blurry, cropped or not a
              digital certificate. Ask the owner for a clearer photo of the sticker.
            </p>
          </div>
        )}

        {found && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge label="QR code found" variant="success" />
              <Badge
                label={hasRegistration ? 'Registration appears in the QR' : 'Registration not in the QR text'}
                variant={hasRegistration ? 'success' : 'neutral'}
              />
            </div>
            <p className="rounded-lg border border-black/10 bg-subtle px-3 py-2 text-xs text-ink font-mono break-all select-all" aria-label="What the QR code says">
              {found.text}
            </p>
            <div className="flex flex-wrap gap-2">
              {found.kind === 'url' && (
                <Button size="sm" href={found.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} aria-hidden="true" />
                  Open the QR link
                </Button>
              )}
              <Button size="sm" onClick={copy}>
                <Copy size={14} aria-hidden="true" />
                Copy
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-black/5 px-3 py-3 text-xs text-muted flex gap-2">
          {found ? <CircleHelp size={15} className="shrink-0 mt-0.5 text-accent" aria-hidden="true" /> : <CircleCheck size={15} className="shrink-0 mt-0.5 text-accent" aria-hidden="true" />}
          <p>
            A QR code only shows the sticker has one. Whether the insurance is valid is decided by the Association of Kenya
            Insurers&apos; verifier — <span className="text-ink">dmvic.com</span>, the AKI Vehicle Insurance Certificate app, or
            USSD <span className="text-ink">*352#</span>. Check that it says <span className="text-ink">Genuine</span> (not
            Invalid, Cancelled or Expired) for <span className="text-ink">{vehicle.registrationNumber}</span>.
          </p>
        </div>
      </section>
    </div>
  );
}
