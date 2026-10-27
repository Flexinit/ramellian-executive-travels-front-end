import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LogOut } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import CircularCountdown from '../ui/CircularCountdown';
import { IDLE_WARNING_SECONDS, useIdleWarning } from '../../hooks/useSession';
import { useAuthStore } from '../../store/authStore';

/**
 * Signs out someone who has left the portal idle (product owner, 2026-10-27) — after a 60-second countdown they can stop
 * with **Stay signed in**. Someone still using it is never signed out: their token is renewed as it runs out
 * (useTokenRefresh). Mounted once near the app root (App.jsx's RootLayout).
 */
export default function IdleSignOutModal() {
  const { warningSince, stay } = useIdleWarning();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  function signOut(reason) {
    clearAuth();
    queryClient.clear();
    navigate('/auth/login');
    if (reason === 'idle') toast("You were signed out because you weren't using the portal.", { icon: 'ℹ️' });
  }

  return (
    <Modal isOpen={!!warningSince} onClose={stay} title="Are you still there?" size="sm">
      {warningSince && (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted">
            You haven&apos;t used the portal for a while. To keep your account safe, you&apos;ll be signed out when the
            countdown ends.
          </p>
          <CircularCountdown startedAt={warningSince} durationSeconds={IDLE_WARNING_SECONDS} onExpire={() => signOut('idle')} label="until you're signed out" />
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={() => signOut()}>
              <LogOut size={16} aria-hidden="true" /> Sign out now
            </Button>
            <Button onClick={stay}>Stay signed in</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
