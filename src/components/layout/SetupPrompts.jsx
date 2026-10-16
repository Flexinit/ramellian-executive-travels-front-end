import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserCircle, IdCard, Car, ArrowRight, X } from 'lucide-react';
import { useSetupPrompts } from '../../hooks/useProfile';
import { isBookingFlowPath } from '../../lib/utils';

function PromptRow({ icon: Icon, message, to, cta, onDismiss }) {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-6 py-2.5">
      <Icon size={16} className="text-brand-gold shrink-0" aria-hidden="true" />
      <p className="flex-1 min-w-0 text-sm text-brand-white">{message}</p>
      <Link
        to={to}
        className="inline-flex items-center gap-1.5 shrink-0 text-sm font-semibold text-brand-gold hover:text-brand-gold-light transition-colors focus-ring rounded-md"
      >
        {cta}
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="p-1 rounded-full text-brand-grey hover:text-brand-white hover:bg-white/10 transition-colors focus-ring"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Global "finish setting up" strip under the Navbar (see App.jsx's
 * RootLayout) — nudges a signed-in user to complete their profile when the
 * backend says `hasCompletedProfile` is false, to upload any still-missing
 * required documents, and a car owner to add a vehicle when
 * `hasAddedVehicleToProfile` is false. A prompt is hidden on
 * the page it links to (no point asking someone to go where they already
 * are) and can be dismissed for the rest of the session; it comes back on
 * the next full page load if the flag is still false.
 */
export default function SetupPrompts() {
  const { needsProfile, needsPhone, needsDocuments, missingDocuments, needsVehicle, profilePath, documentsPath, vehiclePath } =
    useSetupPrompts();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState({ profile: false, documents: false, vehicle: false });

  const dismiss = (key) => setDismissed((d) => ({ ...d, [key]: true }));

  const showProfile = (needsProfile || needsPhone) && !dismissed.profile && pathname !== profilePath;
  // The profile page carries the document uploads too, so it counts as the documents page.
  const showDocuments = needsDocuments && !dismissed.documents && pathname !== documentsPath && pathname !== profilePath;
  const showVehicle = needsVehicle && !dismissed.vehicle && pathname !== vehiclePath;

  // Hidden while booking — see isBookingFlowPath.
  if (isBookingFlowPath(pathname) || (!showProfile && !showDocuments && !showVehicle)) return null;

  return (
    <div role="region" aria-label="Finish setting up your account" className="bg-brand-gold/10 border-b border-brand-gold/20">
      {showProfile && (
        <PromptRow
          icon={UserCircle}
          message={
            needsProfile
              ? "Your profile isn't complete yet — choose Individual or Business and add your details."
              : 'Your profile needs a phone number — add it to finish setting up.'
          }
          to={profilePath}
          cta="Complete profile"
          onDismiss={() => dismiss('profile')}
        />
      )}
      {showDocuments && (
        <PromptRow
          icon={IdCard}
          message={`Documents still needed: ${missingDocuments.join(', ')}.`}
          to={documentsPath}
          cta="Upload documents"
          onDismiss={() => dismiss('documents')}
        />
      )}
      {showVehicle && (
        <PromptRow
          icon={Car}
          message="You haven't added a vehicle yet. List one so renters can start booking it."
          to={vehiclePath}
          cta="Add a vehicle"
          onDismiss={() => dismiss('vehicle')}
        />
      )}
    </div>
  );
}
