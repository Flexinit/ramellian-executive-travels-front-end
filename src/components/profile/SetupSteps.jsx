import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car } from 'lucide-react';
import Button from '../ui/Button';
import StepIndicator from '../ui/StepIndicator';
import PersonalDetailsForm from './PersonalDetailsForm';
import OwnerProfileForm from './OwnerProfileForm';
import DocumentChecklist from '../documents/DocumentChecklist';
import { useCurrentUser, useSetupPrompts } from '../../hooks/useProfile';

const TITLES = {
  personal: 'Your personal details',
  account: 'Your account details',
  documents: 'Your documents',
  vehicle: 'Your first vehicle',
};

const BLURBS = {
  personal: 'Your name, phone number (required), location and ID number.',
  account: 'Are you an individual or a business? Then where your earnings are sent.',
  documents: 'Upload an identity document. Approval usually takes a few hours — you can carry on while it is pending.',
  vehicle: 'List your first vehicle so renters can start booking it.',
};

/**
 * The profile as simple steps, one at a time, in this order:
 *  1. Personal details — every role (`PATCH /users/me`);
 *  2. Account details — car owners only (`PUT /users/me/owner-profile`);
 *  3. Documents — every role;
 *  4. Vehicle — car owners only.
 * Each step saves with its own button and calls only its own endpoint.
 *
 * It never makes someone start over: it opens on the first step that is still
 * unfinished (judged from the backend's completion flags, see `useSetupPrompts`),
 * and after a save it moves to the next unfinished step — the one they haven't
 * done — rather than just the next in line. Every step, finished or not, stays
 * one click away in the step indicator, so anything already entered can be
 * edited later; "Do this later" moves past a step without saving it.
 *
 * @param {function} [onFinish] — called when the person finishes the last step
 * @param {function} [onAllDone] — called when a save leaves nothing unfinished
 */
export default function SetupSteps({ onFinish, onAllDone }) {
  const { isOwner, needsPhone, needsProfile, needsDocuments, needsVehicle, documentsReady, profileLoaded, vehiclePath } =
    useSetupPrompts();
  const { data: currentUser } = useCurrentUser();
  const navigate = useNavigate();

  const keys = ['personal', ...(isOwner ? ['account'] : []), 'documents', ...(isOwner ? ['vehicle'] : [])];
  const labels = { personal: 'Personal', account: 'Account', documents: 'Documents', vehicle: 'Vehicle' };
  const needed = { personal: needsPhone, account: needsProfile, documents: needsDocuments, vehicle: needsVehicle };
  const ready = profileLoaded && documentsReady;

  // `manual` — a step the person chose (indicator, Back, Do this later); otherwise the step is worked out from
  // what is still unfinished, so it settles on the right one as the flags load. `saved` — the step just saved
  // (its flag may not have refreshed yet, so it counts as done); the step to show is then the next unfinished one.
  const [manual, setManual] = useState(null);
  const [saved, setSaved] = useState(null);

  const isNeeded = (i) => i !== saved && needed[keys[i]];
  const nextNeeded = keys.findIndex((_, i) => (saved === null || i > saved) && isNeeded(i));
  const firstNeeded = nextNeeded !== -1 ? nextNeeded : keys.findIndex((_, i) => isNeeded(i));
  const nothingLeft = ready && firstNeeded === -1;
  const derived = firstNeeded !== -1 ? firstNeeded : saved !== null ? saved : 0;

  const index = Math.min(manual ?? derived, keys.length - 1);
  const key = keys[index];
  const isLast = index >= keys.length - 1;

  // A save that leaves nothing unfinished: the whole setup is complete.
  useEffect(() => {
    if (manual === null && saved !== null && nothingLeft) onAllDone?.();
  }, [manual, saved, nothingLeft, onAllDone]);

  function afterSave() {
    setManual(null);
    setSaved(index);
  }

  function later() {
    if (isLast) onFinish?.();
    else setManual(index + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <StepIndicator
        steps={keys.map((k) => ({ label: labels[k], done: ready && !needed[k] }))}
        currentStep={index}
        onStepClick={setManual}
      />
      <p className="text-xs text-muted -mt-2">Tap any step to fill it in or change it — nothing is locked in.</p>

      {nothingLeft && (
        <p role="status" className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          Everything is set up. You can come back to any step to change your details later.
        </p>
      )}

      <div className="flex flex-col gap-1">
        <p className="font-heading text-ink text-lg font-semibold">{TITLES[key]}</p>
        <p className="text-muted text-sm">{BLURBS[key]}</p>
      </div>

      {key === 'personal' && <PersonalDetailsForm submitLabel="Save & Continue" onSaved={afterSave} />}
      {key === 'account' && <OwnerProfileForm submitLabel="Save & Continue" onSaved={afterSave} />}
      {key === 'documents' && (
        <>
          <DocumentChecklist accountType={currentUser?.ownerType} />
          <Button size="lg" className="self-start" onClick={later}>
            Continue
          </Button>
        </>
      )}
      {key === 'vehicle' && (
        <Button
          size="lg"
          className="self-start"
          onClick={() => {
            onFinish?.();
            navigate(vehiclePath);
          }}
        >
          <Car size={15} aria-hidden="true" />
          Add a vehicle
        </Button>
      )}

      <div className="flex items-center justify-between gap-4 pt-1">
        {index > 0 ? (
          <button
            type="button"
            onClick={() => setManual(index - 1)}
            className="text-sm text-muted hover:text-ink transition-colors focus-ring rounded-md"
          >
            ← Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={later}
          className="text-sm text-muted hover:text-ink underline underline-offset-2 transition-colors focus-ring rounded-md"
        >
          {isLast ? 'Finish' : 'Do this later'}
        </button>
      </div>
    </div>
  );
}
