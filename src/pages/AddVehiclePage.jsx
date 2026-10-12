import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import ToggleChip from '../components/ui/ToggleChip';
import StepIndicator from '../components/ui/StepIndicator';
import DraftNotice from '../components/ui/DraftNotice';
import { useFormDraft } from '../hooks/useFormDraft';
import { useAuthStore } from '../store/authStore';
import VehiclePhotoGuide, { PHOTO_ANGLES, angleFileName } from '../components/vehicles/VehiclePhotoGuide';
import { STICKER_ACCEPT } from '../lib/stickerFile';
import { useStickerPicker } from '../hooks/useStickerPicker';
import StickerPreview from '../components/vehicles/StickerPreview';
import { useAttachInsuranceSticker, useCreateVehicle, useUploadVehiclePhoto } from '../hooks/useVehicles';
import { FUEL_OPTIONS, TRANSMISSION_OPTIONS, VEHICLE_DEFAULTS as DEFAULTS, vehicleSchema as schema, windowErrors } from '../lib/vehicleForm';
import { VEHICLE_TRIP_TYPES } from '../lib/vehicleOptions';

/** The vehicle is added in short steps so the form never looks like one long wall of fields. */
const STEPS = [
  { key: 'car', label: 'The car', title: 'About the car', blurb: 'The make and model, its colour, and its registration details.', fields: ['model', 'color', 'registrationNumber', 'vin'] },
  { key: 'price', label: 'Price & place', title: 'Price and location', blurb: 'Where the car is kept and what it costs per day.', fields: ['location', 'pricePerDay', 'capacity'] },
  { key: 'features', label: 'Features', title: 'Features', blurb: 'Fuel, transmission, and how renters can book it.', fields: ['fuelType', 'transmissionType', 'selfDrive', 'chauffeured', 'hasWorkingAC', 'comprehensiveInsurance', 'available', 'availabilityMode', 'availableFrom', 'availableTo', 'tripTypes'] },
  { key: 'photos', label: 'Photos', title: 'Photos', blurb: 'Optional, but renters book with more confidence when they can see every angle.', fields: [] },
];

/**
 * Owner/Admin vehicle intake — the backend has a confirmed
 * `POST /vehicles/create-vehicle` endpoint (not documented in
 * FRONTEND_INTEGRATION.md, but present in the live OpenAPI spec) that
 * nothing in the frontend previously used. It's a four-step form (The car →
 * Price & place → Features → Photos); each step is validated before moving on,
 * and only the last step submits. Photos are uploaded separately after
 * creation via `POST /vehicles/{id}/photos`, once per file, since that
 * endpoint needs the new vehicle's id. The photo picker is guided
 * (VehiclePhotoGuide): front, back, left, right and interior slots.
 */
export default function AddVehiclePage() {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    trigger,
    getValues,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });
  const createVehicle = useCreateVehicle();
  const uploadPhoto = useUploadVehiclePhoto();
  const attachSticker = useAttachInsuranceSticker();

  const selfDrive = watch('selfDrive');
  const chauffeured = watch('chauffeured');
  const tripTypes = watch('tripTypes') || [];
  const availabilityMode = watch('availabilityMode');

  const [stepIndex, setStepIndex] = useState(0);
  const [slotPhotos, setSlotPhotos] = useState({});
  const [extraPhotos, setExtraPhotos] = useState([]);
  const { stickerFile, setStickerFile, stickerError, setStickerError, stickerBusy, pickSticker } = useStickerPicker();
  const [stickerFailed, setStickerFailed] = useState(false);
  const [created, setCreated] = useState(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // A half-filled vehicle (fields and which step you were on) survives a reload; photos can't — a browser
  // won't hand a picked file back — so they're chosen again. Dropped once the vehicle is added.
  const userId = useAuthStore((s) => s.user?.id);
  const { restored, discard } = useFormDraft({
    key: userId ? `vehicle.${userId}` : null,
    watch,
    getValues,
    setValue,
    isDirty,
    extra: stepIndex,
    onRestoreExtra: (savedStep) => setStepIndex(Math.min(Math.max(Number(savedStep) || 0, 0), STEPS.length - 1)),
    resetToBase: () => {
      reset(DEFAULTS);
      setStepIndex(0);
    },
  });

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  function toggleTripType(value) {
    setValue('tripTypes', tripTypes.includes(value) ? tripTypes.filter((t) => t !== value) : [...tripTypes, value], {
      shouldValidate: true,
    });
  }

  function setSlotPhoto(key, file) {
    setSlotPhotos((prev) => {
      const next = { ...prev };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });
  }

  /** Validates just this step's fields, then moves on. */
  async function goNext() {
    const valid = await trigger(step.fields);
    if (step.key === 'features' && !stickerFile) {
      setStickerError('Upload a photo of the insurance sticker');
      return;
    }
    if (step.key === 'features') {
      const problems = Object.entries(windowErrors(getValues()));
      if (problems.length > 0) {
        problems.forEach(([field, message]) => setError(field, { type: 'manual', message }));
        return;
      }
    }
    if (valid) setStepIndex((i) => i + 1);
  }

  /** On a failed final submit, jump back to the first step that has an error. */
  function onInvalid(formErrors) {
    const firstBad = STEPS.findIndex((s) => s.fields.some((f) => formErrors[f]));
    if (firstBad !== -1) setStepIndex(firstBad);
  }

  function handleFormSubmit(e) {
    if (!isLastStep) {
      e.preventDefault();
      goNext();
      return;
    }
    return handleSubmit(onSubmit, onInvalid)(e);
  }

  async function onSubmit(values) {
    createVehicle.mutate(values, {
      onSuccess: async (vehicle) => {
        toast.success('Vehicle created.');
        setCreated(vehicle);

        // One upload per photo. Guided angles are uploaded under their angle name
        // (front.jpg, left.jpg…) since the endpoint has no angle field, so a
        // failure can also be reported by angle.
        // The insurance sticker goes first: it's mandatory, and a failure is offered a retry below.
        setUploadingPhotos(true);
        try {
          await attachSticker.mutateAsync({ vehicle, file: stickerFile });
        } catch {
          setStickerFailed(true);
        }
        setUploadingPhotos(false);

        const uploads = [
          ...PHOTO_ANGLES.filter((a) => slotPhotos[a.key]).map((a) => ({
            label: a.label,
            file: new File([slotPhotos[a.key]], angleFileName(a.key, slotPhotos[a.key]), { type: slotPhotos[a.key].type }),
          })),
          ...extraPhotos.map((file) => ({ label: file.name, file })),
        ];

        if (uploads.length > 0) {
          setUploadingPhotos(true);
          const results = await Promise.allSettled(
            uploads.map(({ file }) => uploadPhoto.mutateAsync({ vehicleId: vehicle.id, file }))
          );
          setUploadingPhotos(false);
          const failed = uploads.filter((_, i) => results[i].status === 'rejected').map((u) => u.label);
          if (failed.length > 0) {
            toast.error(`Couldn't upload: ${failed.join(', ')}.`);
          } else {
            toast.success('Photos uploaded.');
          }
        }

        reset(DEFAULTS);
        setSlotPhotos({});
        setExtraPhotos([]);
      },
    });
  }

  async function retrySticker() {
    try {
      await attachSticker.mutateAsync({ vehicle: created, file: stickerFile });
      setStickerFailed(false);
      toast.success('Insurance sticker uploaded.');
    } catch {
      toast.error("Couldn't upload the insurance sticker. Please try again.");
    }
  }

  function handleAddAnother() {
    setCreated(null);
    setStickerFile(null);
    setStickerFailed(false);
    setStepIndex(0);
  }

  return (
    <PageWrapper className="max-w-2xl">
      <PageTitle title="Add Vehicle" />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">Add Vehicle</h1>
          <p className="text-brand-grey text-sm mt-1">Add a new vehicle to the fleet — four quick steps.</p>
        </div>

        {created ? (
          <Card className="p-6 flex flex-col items-center text-center gap-4">
            <CheckCircle2 size={40} className="text-emerald-400" aria-hidden="true" />
            <div>
              <h2 className="font-heading text-brand-white text-lg font-semibold">
                {created.model} added
              </h2>
              <p className="text-brand-grey text-sm mt-1">
                {uploadingPhotos ? 'Uploading photos…' : 'Sent for approval — renters will see it once an administrator approves it.'}
              </p>
            </div>
            {stickerFailed && (
              <div role="alert" className="flex flex-col items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <p>The insurance sticker photo didn't upload. Vehicles need it, so please try again.</p>
                <Button size="sm" onClick={retrySticker} loading={attachSticker.isPending}>
                  Try again
                </Button>
              </div>
            )}
            <div className="flex gap-3">
              <Button to={`/vehicles/${created.id}`}>View Vehicle</Button>
              <Button onClick={handleAddAnother}>
                Add Another
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-6 sm:p-8 flex flex-col gap-6">
            {restored && <DraftNotice onDiscard={discard} note="Photos and the insurance sticker aren't kept — add them again." />}

            <StepIndicator steps={STEPS.map((s) => ({ label: s.label }))} currentStep={stepIndex} />

            <div className="flex flex-col gap-1">
              <h2 className="font-heading text-brand-white text-lg font-semibold">{step.title}</h2>
              <p className="text-brand-grey text-sm">{step.blurb}</p>
            </div>

            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4" noValidate>
              {step.key === 'car' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Model" placeholder="e.g. Toyota Prado" error={errors.model?.message} register={register('model')} />
                    <Input label="Color" placeholder="e.g. Pearl White" error={errors.color?.message} register={register('color')} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Registration Number" error={errors.registrationNumber?.message} register={register('registrationNumber')} />
                    <Input label="VIN" error={errors.vin?.message} register={register('vin')} />
                  </div>
                </>
              )}

              {step.key === 'price' && (
                <>
                  <Input label="Location" placeholder="e.g. Nairobi CBD" error={errors.location?.message} register={register('location')} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Price per Day (KES)"
                      type="number"
                      min="0"
                      step="1"
                      error={errors.pricePerDay?.message}
                      register={register('pricePerDay')}
                    />
                    <Input
                      label="Seat Capacity"
                      type="number"
                      min="1"
                      step="1"
                      error={errors.capacity?.message}
                      register={register('capacity')}
                    />
                  </div>
                </>
              )}

              {step.key === 'features' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select label="Fuel Type" options={FUEL_OPTIONS} error={errors.fuelType?.message} register={register('fuelType')} />
                    <Select
                      label="Transmission"
                      options={TRANSMISSION_OPTIONS}
                      error={errors.transmissionType?.message}
                      register={register('transmissionType')}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-brand-white">Booking Mode</span>
                    <div role="group" aria-label="Booking mode" className="flex gap-2">
                      <ToggleChip size="md" active={selfDrive} onClick={() => setValue('selfDrive', !selfDrive, { shouldValidate: true })}>
                        Self-Drive
                      </ToggleChip>
                      <ToggleChip size="md" active={chauffeured} onClick={() => setValue('chauffeured', !chauffeured, { shouldValidate: true })}>
                        Chauffeured
                      </ToggleChip>
                    </div>
                    {!selfDrive && !chauffeured && <p className="text-xs text-brand-grey">None picked — renters can book it either way.</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 cursor-pointer">
                      <input type="checkbox" className="accent-brand-gold h-4 w-4" {...register('hasWorkingAC')} />
                      <span className="text-sm font-medium text-brand-white">Working air conditioning</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 cursor-pointer">
                      <input type="checkbox" className="accent-brand-gold h-4 w-4" {...register('comprehensiveInsurance')} />
                      <span className="text-sm font-medium text-brand-white">
                        Comprehensive insurance <span aria-hidden="true" className="text-brand-gold">*</span>
                      </span>
                    </label>
                  </div>
                  {errors.comprehensiveInsurance && <p className="text-xs text-red-400">{errors.comprehensiveInsurance.message}</p>}

                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-brand-white">
                      Insurance sticker photo <span aria-hidden="true" className="text-brand-gold">*</span>
                    </span>
                    <p className="text-xs text-brand-grey">
                      We only list vehicles with comprehensive insurance. Upload a clear photo of the insurance sticker on the windscreen, or a PDF of it.
                    </p>
                    {stickerBusy && (
                      <p role="status" className="text-xs text-brand-grey">Reading the PDF…</p>
                    )}
                    {stickerFile && <StickerPreview file={stickerFile} />}
                    {stickerFile ? (
                      <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                        <ShieldCheck size={13} aria-hidden="true" />
                        <span className="truncate max-w-[220px]">{stickerFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setStickerFile(null)}
                          aria-label="Remove insurance sticker photo"
                          className="p-0.5 rounded-full text-brand-grey hover:text-brand-white hover:bg-white/10 focus-ring"
                        >
                          <X size={12} aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <label className="inline-flex items-center gap-1.5 w-fit text-xs font-semibold text-brand-gold hover:text-brand-gold-light cursor-pointer rounded-md px-1 focus-within:ring-2 focus-within:ring-brand-gold">
                        <ShieldCheck size={13} aria-hidden="true" />
                        Add insurance sticker photo
                        <input type="file" accept={STICKER_ACCEPT} className="sr-only" onChange={pickSticker} />
                      </label>
                    )}
                    {stickerError && <p className="text-xs text-red-400">{stickerError}</p>}
                  </div>

                  <label className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 cursor-pointer">
                    <input type="checkbox" className="accent-brand-gold h-4 w-4" {...register('available')} />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-brand-white">Available for booking</span>
                      <span className="text-xs text-brand-grey">Untick to add it now but keep it hidden from renters. You can change this any time from My Vehicles.</span>
                    </span>
                  </label>

                  <fieldset className="flex flex-col gap-2">
                    <legend className="text-sm font-medium text-brand-white mb-1">When can it be booked?</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { value: 'always', label: 'Always available', hint: 'Renters can book it any time it is free.' },
                        { value: 'dates', label: 'Only on specific dates', hint: 'You choose the dates and times.' },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-brand-gold ${
                            availabilityMode === opt.value ? 'border-brand-gold bg-brand-gold/10' : 'border-white/10 bg-white/5 hover:border-brand-gold/40'
                          }`}
                        >
                          <input type="radio" value={opt.value} className="accent-brand-gold mt-1" {...register('availabilityMode')} />
                          <span className="flex flex-col">
                            <span className="text-sm font-medium text-brand-white">{opt.label}</span>
                            <span className="text-xs text-brand-grey">{opt.hint}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    {availabilityMode === 'dates' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <Input
                          label="Available from"
                          type="datetime-local"
                          required
                          error={errors.availableFrom?.message}
                          register={register('availableFrom')}
                        />
                        <Input
                          label="Available until"
                          type="datetime-local"
                          required
                          error={errors.availableTo?.message}
                          register={register('availableTo')}
                        />
                      </div>
                    )}
                  </fieldset>

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-brand-white">
                      Trip Types <span className="text-brand-grey font-normal">(optional)</span>
                    </span>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Trip types">
                      {VEHICLE_TRIP_TYPES.map((t) => (
                        <ToggleChip key={t.value} active={tripTypes.includes(t.value)} onClick={() => toggleTripType(t.value)}>
                          {t.label}
                        </ToggleChip>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step.key === 'photos' && (
                <VehiclePhotoGuide
                  slots={slotPhotos}
                  onSlotChange={setSlotPhoto}
                  extras={extraPhotos}
                  onExtrasChange={setExtraPhotos}
                />
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                {stepIndex > 0 ? (
                  <Button type="button" onClick={() => setStepIndex((i) => i - 1)}>
                    ← Back
                  </Button>
                ) : (
                  <span />
                )}
                {isLastStep ? (
                  <Button type="submit" size="lg" loading={createVehicle.isPending}>
                    Add Vehicle
                  </Button>
                ) : (
                  <Button type="submit" size="lg">
                    Continue
                  </Button>
                )}
              </div>
            </form>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
