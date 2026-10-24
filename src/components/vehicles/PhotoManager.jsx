import React, { useRef, useState } from 'react';
import { ImageOff, Repeat2, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import AuthImage from './AuthImage';
import { useDeleteVehiclePhoto, useReplaceVehiclePhoto } from '../../hooks/useVehicles';

/** One photo with its Replace and Remove buttons. */
function PhotoTile({ vehicle, photo, index, onRemove }) {
  const replace = useReplaceVehiclePhoto();
  const input = useRef(null);
  const label = `photo ${index + 1}`;
  const editable = !!photo.id; // a photo's id is what the backend needs; without it nothing can be changed
  const busy = replace.isPending;

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-black/10 bg-black/5">
      <div className="aspect-[4/3] bg-subtle">
        <AuthImage
          src={photo.url}
          alt={`${vehicle.model} — ${label}`}
          className="h-full w-full object-cover"
          fallback={<span className="flex h-full w-full items-center justify-center text-muted"><ImageOff size={24} aria-hidden="true" /></span>}
        />
      </div>
      <div className="flex flex-wrap gap-2 p-2">
        <Button size="sm" disabled={!editable || busy} loading={busy} onClick={() => input.current?.click()} aria-label={`Replace ${label}`} title={editable ? undefined : "This photo can't be changed from here — its id isn't known."}>
          <Repeat2 size={14} aria-hidden="true" />
          Replace
        </Button>
        <Button size="sm" variant="danger" disabled={!editable || busy} onClick={() => onRemove(photo)} aria-label={`Remove ${label}`}>
          <Trash2 size={14} aria-hidden="true" />
          Remove
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-label={`Choose a new file to replace ${label}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) replace.mutate({ vehicleId: vehicle.id, photoId: photo.id, file });
          }}
        />
      </div>
    </li>
  );
}

/**
 * The photos a vehicle has, each with **Replace** and **Remove** (`DELETE /vehicles/{id}/photos/{photoId}`). These act at once — they
 * don't wait for the form's Save. Replace adds the new photo first and removes the old one after, so a failure never loses a photo.
 * Only photos whose id is known can be changed: the backend doesn't list a vehicle's photos, so those are the ones uploaded from this
 * browser.
 *
 * @param {{ id: string, model: string, photos?: Array<{ id?: string, url: string }> }} vehicle
 */
export default function PhotoManager({ vehicle }) {
  const remove = useDeleteVehiclePhoto();
  const [removing, setRemoving] = useState(null);
  const photos = Array.isArray(vehicle.photos) ? vehicle.photos : [];

  if (photos.length === 0) {
    return (
      <p className="flex items-start gap-2 text-sm text-muted">
        <ImageOff size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          No photos to show or change here — the backend doesn&apos;t list a vehicle&apos;s photos, so only photos uploaded from this browser appear.
          A photo added elsewhere can&apos;t be removed until the backend returns its id with the vehicle.
        </span>
      </p>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Current photos">
        {photos.map((photo, i) => (
          <PhotoTile key={photo.id || photo.url || i} vehicle={vehicle} photo={photo} index={i} onRemove={setRemoving} />
        ))}
      </ul>

      <Modal isOpen={!!removing} onClose={() => setRemoving(null)} title="Remove photo">
        <div className="flex flex-col gap-4">
          <p className="text-muted text-sm">This deletes the photo from {vehicle.model}. It can&apos;t be undone.</p>
          <div className="flex gap-3 justify-end">
            <Button onClick={() => setRemoving(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => remove.mutate({ vehicleId: vehicle.id, photoId: removing.id }, { onSuccess: () => setRemoving(null) })}
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
