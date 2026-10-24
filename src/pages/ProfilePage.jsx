import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Spinner from '../components/ui/Spinner';
import Card from '../components/ui/Card';
import ProfilePhotoPicker from '../components/profile/ProfilePhotoPicker';
import SetupSteps from '../components/profile/SetupSteps';
import SecuritySection from '../components/profile/SecuritySection';
import SavedSignatureSection from '../components/profile/SavedSignatureSection';
import { useAuthStore } from '../store/authStore';
import { useCurrentUser } from '../hooks/useProfile';
import { USER_ROLES } from '../lib/constants';

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
    <>
      <PageWrapper className="max-w-2xl">
        <PageTitle title="Profile" />
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="font-heading text-ink text-xl sm:text-2xl font-semibold">Profile</h1>
              <p className="text-muted text-sm mt-1">Keep your details and documents up to date, one step at a time.</p>
            </div>
            {/* The design's profile header: the photo (tap the camera to change it), the name and the email. */}
            <Card className="p-4 flex items-center gap-4">
              <ProfilePhotoPicker name={displayName} size="xl" />
              <div className="min-w-0">
                <p className="font-heading text-ink text-base font-semibold truncate">{displayName}</p>
                {email && email !== displayName && <p className="text-muted text-sm truncate">{email}</p>}
              </div>
            </Card>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" label="Loading profile" />
            </div>
          ) : (
            <SetupSteps onFinish={() => navigate(isOwner ? '/owner' : '/dashboard')} />
          )}

          <SavedSignatureSection />

          <SecuritySection />
        </div>
      </PageWrapper>
    </>
  );
}
