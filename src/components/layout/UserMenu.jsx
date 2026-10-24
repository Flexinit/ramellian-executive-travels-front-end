import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, ShieldCheck, LogOut } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import DropdownMenu from './DropdownMenu';
import { useAuthStore } from '../../store/authStore';
import { USER_ROLES } from '../../lib/constants';
import { primaryRoleLabel } from '../../lib/utils';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';

/**
 * Avatar-triggered account dropdown. Link set depends on the signed-in
 * user's role; renders nothing when signed out.
 */
export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { photoUrl } = useProfilePhoto();

  if (!user) return null;

  // `firstName`/`lastName` come from GET /users/me and may not have landed
  // yet right after login — fall back to the email that's already on the
  // user from the access token's own claims (see authStore.js).
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Account';
  const roleLabel = primaryRoleLabel(user.roles);

  const items = [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }];

  // An administrator's token also carries a fleet-manager role whether or not they own anything, so for them only a
  // real car-owner role earns the Owner Panel link.
  const isAdmin = user.roles?.includes(USER_ROLES.ADMIN);
  if (user.roles?.includes(USER_ROLES.OWNER) || (!isAdmin && user.roles?.includes(USER_ROLES.MANAGER))) {
    items.push({ label: 'Owner Panel', to: '/owner', icon: Building2 });
  }
  if (user.roles?.includes(USER_ROLES.ADMIN)) {
    items.push({ label: 'Admin Panel', to: '/admin', icon: ShieldCheck });
  }

  items.push({
    label: 'Log Out',
    icon: LogOut,
    onClick: () => {
      clearAuth();
      navigate('/');
    },
  });

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Account menu for ${displayName}`}
        onClick={() => setOpen((o) => !o)}
        className="focus-ring rounded-full"
      >
        <Avatar name={displayName} src={photoUrl} />
      </button>
      <DropdownMenu
        isOpen={open}
        onClose={() => setOpen(false)}
        items={items}
        className="right-0 left-auto"
        header={
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-ink truncate">{displayName}</span>
            {roleLabel && <Badge label={roleLabel} variant="gold" className="self-start" />}
          </div>
        }
      />
    </div>
  );
}
