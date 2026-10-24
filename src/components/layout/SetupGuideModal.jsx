import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Modal from '../ui/Modal';
import SetupSteps from '../profile/SetupSteps';
import { useSetupPrompts } from '../../hooks/useProfile';
import { useAuthStore } from '../../store/authStore';
import { isBookingFlowPath } from '../../lib/utils';

/**
 * Right after sign-in, if the backend says something is still missing (see
 * `useSetupPrompts`), opens a window that walks the user through it as simple
 * steps — Personal details → Account details → Documents → Vehicle (see
 * SetupSteps; account and vehicle are for car owners only), starting on the
 * first step that still needs attention. Once opened it stays open while the
 * person works through the steps (saving doesn't make it vanish mid-way) and
 * closes when they finish. "Remind me later" closes it for this session (per
 * account) and leaves the SetupPrompts banner as the reminder. It stays out
 * of the way on the pages the steps live on (the Profile, Documents and
 * add-vehicle pages), while the flags are still unknown, and while booking a vehicle (checkout to signature —
 * someone who just signed up mid-checkout shouldn't be pulled away from paying); it opens once they leave.
 */
export default function SetupGuideModal() {
  const { needsProfile, needsPhone, needsDocuments, documentsReady, needsVehicle, profilePath, documentsPath, vehiclePath } =
    useSetupPrompts();
  const userId = useAuthStore((s) => s.user?.id);
  const { pathname } = useLocation();
  const [dismissedFor, setDismissedFor] = useState(null);
  const [active, setActive] = useState(false);

  const anythingNeeded = needsProfile || needsPhone || needsDocuments || needsVehicle;
  // Wait for the documents check so the window opens on the right step rather than jumping ahead to the vehicle.
  useEffect(() => {
    if (anythingNeeded && documentsReady) setActive(true);
  }, [anythingNeeded, documentsReady]);

  if (!active || dismissedFor === userId || [profilePath, documentsPath, vehiclePath].includes(pathname) || isBookingFlowPath(pathname)) return null;

  const close = () => setDismissedFor(userId);

  return (
    <Modal isOpen onClose={close} title="Finish setting up your account" size="lg">
      <div className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto pr-1">
        <SetupSteps onFinish={close} onAllDone={close} />

        <button
          type="button"
          onClick={close}
          className="self-start text-sm text-muted hover:text-ink transition-colors focus-ring rounded-md"
        >
          Remind me later
        </button>
      </div>
    </Modal>
  );
}
