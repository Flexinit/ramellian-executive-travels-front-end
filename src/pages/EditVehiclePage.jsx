import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { ArrowLeft, ShieldCheck, X } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import ToggleChip from '../components/ui/ToggleChip';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import AuthImage from '../components/vehicles/AuthImage';
import PhotoManager from '../components/vehicles/PhotoManager';
import VehiclePhotoGuide, { PHOTO_ANGLES, angleFileName } from '../components/vehicles/VehiclePhotoGuide';
import { STICKER_ACCEPT } from '../lib/stickerFile';
import { useStickerPicker } from '../hooks/useStickerPicker';
import StickerPreview from '../components/vehicles/StickerPreview';
import { useAttachInsuranceSticker, useUpdateVehicle, useUploadVehiclePhoto, useVehicle } from '../hooks/useVehicles';
import { useAuthStore } from '../store/authStore';
import { FUEL_OPTIONS, TRANSMISSION_OPTIONS, vehicleSchema, vehicleToFormValues, windowErrors } from '../lib/vehicleForm';
import { USER_ROLES } from '../lib/constants';
import { VEHICLE_TRIP_TYPES, isOwnVehicle } from '../lib/vehicleOptions';

function Section({ title, hint, children }) {
  return (
    <Card className="p-5 sm:p-6 flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-ink text-lg font-semibold">{title}</h2>
        {hint && <p className="text-muted text-sm mt-0.5">{hint}</p>}
      </div>
      {children}
    </Card>
  );
}

/**
 * Edit a vehicle — every detail the add-vehicle form asks for, its insurance sticker, and more photos. For the vehicle's
 * owner, or an administrator (at `/owner/vehicles/:id/edit` or `/admin/vehicles/:id/edit`). Saving sends
 * `PUT /vehicles/{id}`; a replacement sticker and new photos go up through `POST /vehicles/{id}/photos`.
 * Photos can be replaced or removed (`DELETE /vehicles/{id}/photos/{photoId}`) for the ones whose id is known — see PhotoManager.
 */
export default function EditVehiclePage() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const { data: vehicle, isLoading, isError, error, refetch } = useVehicle(vehicleId);
  const updateVehicle = useUpdateVehicle();
  const attachSticker = useAttachInsuranceSticker();
  const uploadPhoto = useUploadVehiclePhoto();

  const {
    register, handleSubmit, reset, watch, setValue, setError, getValues, formState: { errors },
  } = useForm({ resolver: zodResolver(vehicleSchema), defaultValues: vehicleToFormValues() });

  const [slotPhotos, setSlotPhotos] = useState({});
  const [extraPhotos, setExtraPhotos] = useState([]);
  const { stickerFile, setStickerFile, stickerError, setStickerError, stickerBusy, pickSticker } = useStickerPicker();
  const [saving, setSaving] = useState(false);

  // Fill the form once the vehicle has loaded (and again if a different vehicle is opened).
  useEffect(() => {
    if (vehicle?.id) reset(vehicleToFormValues(vehicle));
  }, [vehicle?.id, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const selfDrive = watch('selfDrive');
  const chauffeured = watch('chauffeured');
  const tripTypes = watch('tripTypes') || [];
  const availabilityMode = watch('availabilityMode');
  const backTo = pathname.startsWith('/admin') ? '/admin/vehicles' : '/owner/vehicles';
  const isAdmin = (user?.roles || []).includes(USER_ROLES.ADMIN);

  if (isLoading) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" label="Loading vehicle" />
      </PageWrapper>
    );
  }
  if (isError || !vehicle) {
    return (
      <PageWrapper>
        <ErrorBanner message={error?.response?.data?.message || 'Could not load this vehicle.'} onRetry={refetch} />
      </PageWrapper>
    );
  }
  if (!isAdmin && !isOwnVehicle(vehicle, user)) {
    return (
      <PageWrapper>
        <ErrorBanner message="You can only edit your own vehicles." />
      </PageWrapper>
    );
  }

  const hasSticker = !!vehicle.insuranceVerificationStickerPhoto;

  function toggleTripType(value) {
    setValue('tripTypes', tripTypes.includes(value) ? tripTypes.filter((t) => t !== value) : [...tripTypes, value], { shouldValidate: true });
  }

  function setSlotPhoto(key, file) {
    setSlotPhotos((prev) => {
      const next = { ...prev };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });
  }

  async function onSubmit(values) {
    // The whole-form rule that only runs once every field is valid.
    const problems = Object.entries(windowErrors(getValues()));
    if (problems.length > 0) {
      problems.forEach(([field, message]) => setError(field, { type: 'manual', message }));
      return;
    }
    // Every vehicle needs its insurance sticker: the one it already has, or a new one picked here.
    if (!hasSticker && !stickerFile) {
      setStickerError('Upload a photo of the insurance sticker');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateVehicle.mutateAsync({ vehicle, values });

      let stickerFailed = false;
      if (stickerFile) {
        try {
          await attachSticker.mutateAsync({ vehicle: updated, file: stickerFile });
        } catch {
          stickerFailed = true;
        }
      }

      const uploads = [
        ...PHOTO_ANGLES.filter((a) => slotPhotos[a.key]).map((a) => ({
          label: a.label,
          slot: a.key,
          file: new File([slotPhotos[a.key]], angleFileName(a.key, slotPhotos[a.key]), { type: slotPhotos[a.key].type }),
        })),
        ...extraPhotos.map((file) => ({ label: file.name, extra: file, file })),
      ];
      const results = await Promise.allSettled(uploads.map(({ file }) => uploadPhoto.mutateAsync({ vehicleId: vehicle.id, file })));
      const failed = uploads.filter((_, i) => results[i].status === 'rejected').map((u) => u.label);

      // A photo that went up is done: drop it from the form, so pressing Save again (because something else failed) can't add it a second time.
      const sent = uploads.filter((_, i) => results[i].status === 'fulfilled');
      if (sent.length > 0) {
        setSlotPhotos((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !sent.some((u) => u.slot === key))));
        setExtraPhotos((prev) => prev.filter((file) => !sent.some((u) => u.extra === file)));
      }

      if (stickerFailed) toast.error("Your changes were saved, but the new insurance sticker photo didn't upload. Please try again.");
      if (failed.length > 0) toast.error(`Your changes were saved, but these photos didn't upload: ${failed.join(', ')}.`);
      if (!stickerFailed && failed.length === 0) toast.success(`${values.model} was updated.`);
      if (!stickerFailed && failed.length === 0) navigate(backTo);
    } catch {
      // useUpdateVehicle has already told the person why; stay on the form so nothing typed is lost.
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageWrapper className="max-w-2xl">
      <PageTitle title={`Edit ${vehicle.model}`} />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Button to={backTo} size="sm" className="self-start">
            <ArrowLeft size={14} aria-hidden="true" />
            Back to vehicles
          </Button>
          <div>
            <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Edit vehicle</h1>
            <p className="text-muted text-sm mt-1">
              {vehicle.model} · {vehicle.registrationNumber}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
          <Section title="The car">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Model" error={errors.model?.message} register={register('model')} />
              <Input label="Color" error={errors.color?.message} register={register('color')} />
              <Input label="Registration Number" error={errors.registrationNumber?.message} register={register('registrationNumber')} />
              <Input label="Year of manufacture (optional)" type="number" inputMode="numeric" placeholder="e.g. 2019" error={errors.year?.message} register={register('year')} />
              <Input label="VIN" error={errors.vin?.message} register={register('vin')} />
            </div>
          </Section>

          <Section title="Price and place">
            <Input label="Location" error={errors.location?.message} register={register('location')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Price per Day (KES)" type="number" min="0" step="1" error={errors.pricePerDay?.message} register={register('pricePerDay')} />
              <Input label="Seat Capacity" type="number" min="1" step="1" error={errors.capacity?.message} register={register('capacity')} />
            </div>
          </Section>

          <Section title="Features and booking">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label="Fuel Type" options={FUEL_OPTIONS} error={errors.fuelType?.message} register={register('fuelType')} />
              <Select label="Transmission" options={TRANSMISSION_OPTIONS} error={errors.transmissionType?.message} register={register('transmissionType')} />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">Booking Mode</span>
              <div role="group" aria-label="Booking mode" className="flex gap-2">
                <ToggleChip size="md" active={selfDrive} onClick={() => setValue('selfDrive', !selfDrive, { shouldValidate: true })}>
                  Self-Drive
                </ToggleChip>
                <ToggleChip size="md" active={chauffeured} onClick={() => setValue('chauffeured', !chauffeured, { shouldValidate: true })}>
                  Chauffeured
                </ToggleChip>
              </div>
              {!selfDrive && !chauffeured && <p className="text-xs text-muted">None picked — renters can book it either way.</p>}
            </div>

            <label className="flex items-center gap-3 rounded-lg bg-ink/5 px-3 py-2.5 cursor-pointer">
              <input type="checkbox" className="accent-accent h-4 w-4" {...register('hasWorkingAC')} />
              <span className="text-sm font-medium text-ink">Working air conditioning</span>
            </label>

            <label className="flex items-center gap-3 rounded-lg bg-ink/5 px-3 py-2.5 cursor-pointer">
              <input type="checkbox" className="accent-accent h-4 w-4" {...register('available')} />
              <span className="flex flex-col">
                <span className="text-sm font-medium text-ink">Available for booking</span>
                <span className="text-xs text-muted">Untick to keep it hidden from renters.</span>
              </span>
            </label>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-ink mb-1">When can it be booked?</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { value: 'always', label: 'Always available', hint: 'Renters can book it any time it is free.' },
                  { value: 'dates', label: 'Only on specific dates', hint: 'You choose the dates and times.' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-accent ${
                      availabilityMode === opt.value ? 'border-accent bg-accent/10' : 'border-ink/10 bg-ink/5 hover:border-accent/40'
                    }`}
                  >
                    <input type="radio" value={opt.value} className="accent-accent mt-1" {...register('availabilityMode')} />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-ink">{opt.label}</span>
                      <span className="text-xs text-muted">{opt.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              {availabilityMode === 'dates' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <Input label="Available from" type="datetime-local" required error={errors.availableFrom?.message} register={register('availableFrom')} />
                  <Input label="Available until" type="datetime-local" required error={errors.availableTo?.message} register={register('availableTo')} />
                </div>
              )}
            </fieldset>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">
                Trip Types <span className="text-muted font-normal">(optional)</span>
              </span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Trip types">
                {VEHICLE_TRIP_TYPES.map((t) => (
                  <ToggleChip key={t.value} active={tripTypes.includes(t.value)} onClick={() => toggleTripType(t.value)}>
                    {t.label}
                  </ToggleChip>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Insurance" hint="We only list vehicles with comprehensive insurance and a photo (or PDF) of its sticker.">
            <label className="flex items-center gap-3 rounded-lg bg-ink/5 px-3 py-2.5 cursor-pointer">
              <input type="checkbox" className="accent-accent h-4 w-4" {...register('comprehensiveInsurance')} />
              <span className="text-sm font-medium text-ink">
                Comprehensive insurance <span aria-hidden="true" className="text-accent">*</span>
              </span>
            </label>
            {errors.comprehensiveInsurance && <p className="text-xs text-red-600">{errors.comprehensiveInsurance.message}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Insurer (optional)" placeholder="e.g. Jubilee Insurance" error={errors.insurer?.message} register={register('insurer')} />
              <Input label="Policy number (optional)" error={errors.policyNumber?.message} register={register('policyNumber')} />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">Insurance sticker photo</span>
              {hasSticker && !stickerFile && (
                <AuthImage
                  src={vehicle.insuranceVerificationStickerPhoto}
                  alt="Current insurance sticker"
                  className="h-32 w-auto rounded-lg border border-ink/10 object-contain self-start"
                  fallback={<p className="text-xs text-muted">A sticker photo is on file (it can&apos;t be shown here).</p>}
                />
              )}
              {stickerBusy && (
                <p role="status" className="text-xs text-muted">Reading the PDF…</p>
              )}
              {stickerFile && <StickerPreview file={stickerFile} />}
              {stickerFile ? (
                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
                  <ShieldCheck size={13} aria-hidden="true" />
                  <span className="truncate max-w-[220px]">{stickerFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setStickerFile(null)}
                    aria-label="Remove the new insurance sticker photo"
                    className="p-0.5 rounded-full text-muted hover:text-ink hover:bg-ink/10 focus-ring"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-1.5 w-fit text-xs font-semibold text-accent hover:text-accent-hover cursor-pointer rounded-md px-1 focus-within:ring-2 focus-within:ring-accent">
                  <ShieldCheck size={13} aria-hidden="true" />
                  {hasSticker ? 'Replace insurance sticker photo' : 'Add insurance sticker photo'}
                  <input type="file" accept={STICKER_ACCEPT} className="sr-only" onChange={pickSticker} />
                </label>
              )}
              {stickerError && <p className="text-xs text-red-600">{stickerError}</p>}
            </div>
          </Section>

          <Section
            title="Photos"
            hint="Replace or remove a photo below — that happens straight away, without pressing Save. Add more photos underneath."
          >
            <PhotoManager vehicle={vehicle} />
            <div className="flex flex-col gap-2 border-t border-ink/10 pt-4">
              <span className="text-sm font-medium text-ink">Add photos</span>
              <VehiclePhotoGuide slots={slotPhotos} onSlotChange={setSlotPhoto} extras={extraPhotos} onExtrasChange={setExtraPhotos} />
            </div>
          </Section>

          <div className="flex items-center justify-end gap-3">
            <Button to={backTo}>Cancel</Button>
            <Button type="submit" size="lg" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </PageWrapper>
  );
}
