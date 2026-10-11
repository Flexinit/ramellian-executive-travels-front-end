import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import PageBackdrop from '../components/layout/PageBackdrop';
import PageTitle from '../components/layout/PageTitle';
import Spinner from '../components/ui/Spinner';
import ProfilePhotoPicker from '../components/profile/ProfilePhotoPicker';
import SetupSteps from '../components/profile/SetupSteps';
import SecuritySection from '../components/profile/SecuritySection';
import { useAuthStore } from '../store/authStore';
import { useCurrentUser } from '../hooks/useProfile';
import { USER_ROLES } from '../lib/constants';
import nairobiSkyline from '../assets/destinations/nairobi-skyline.jpg';

/**
 * Profile, as simple steps rather than one long page: Personal details →
 * Account details (car owners) → Documents → Vehicle (car owners). See
 * SetupSteps.
 */
export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { data: currentUser, isLoading } = useCurrentUser();

  const email = currentUser?.email || user?.email;
  const displayName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || email || 'Account';
  const isOwner = (user?.roles || []).includes(USER_ROLES.OWNER);

  return (
    <PageBackdrop image={nairobiSkyline}>
      <PageWrapper className="max-w-2xl">
        <PageTitle title="Profile" />
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-4">
            <ProfilePhotoPicker name={displayName} size="xl" />
            <div>
              <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">Profile</h1>
              <p className="text-brand-grey text-sm mt-1">Keep your details and documents up to date, one step at a time.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" label="Loading profile" />
            </div>
          ) : (
            <SetupSteps onFinish={() => navigate(isOwner ? '/owner' : '/dashboard')} />
          )}

          <SecuritySection />
        </div>
      </PageWrapper>
    </PageBackdrop>
  );
}
