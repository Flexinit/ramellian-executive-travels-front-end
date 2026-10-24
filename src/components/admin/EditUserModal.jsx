import React, { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Info } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import { useSetUserEnabled, useSetUserRole } from '../../hooks/useAdminUsers';
import { useRoles } from '../../hooks/useRolesPermissions';
import { roleTitle } from '../../lib/rolesPermissions';
import { useAuthStore } from '../../store/authStore';
import { roleBadges, userDisplayName } from '../../lib/adminUsers';
import { ASSIGNABLE_ROLES, BACKEND_ROLE_LABELS } from '../../lib/constants';

/** What each role opens up in this portal. */
const ROLE_HELP = {
  CAR_RENTER: 'Browses and books vehicles.',
  CAR_OWNER: 'Gets the Owner Panel to list and manage vehicles.',
  MANAGE: 'Gets the Owner Panel as a fleet manager.',
  ADMIN: 'Gets the Admin Panel to run the platform.',
  SUPER_ADMIN: 'Gets the Admin Panel, including managing users.',
};

/**
 * Edit an account: everything the backend lets an administrator change on someone else's account —
 *  - whether it is switched on (`PUT /users/admin/{id}/enabled`, applied straight away), and
 *  - its role (`PUT /users/admin/{id}/role`, applied with Save role).
 * A person's permissions come with their role (they arrive in the login token); what a role itself can do is edited under
 * Roles & Permissions (`/roles`, `/permissions`). The roles offered are the ones that exist (`GET /roles`). Name, phone,
 * location and the other personal details can only be changed by
 * the person themselves (`PATCH /users/me`), so they are shown here but not editable.
 *
 * @param {object|null} user — the account to edit; the modal is open while this is set
 * @param {function} onClose
 */
export default function EditUserModal({ user, onClose }) {
  const setRole = useSetUserRole();
  const setEnabled = useSetUserEnabled();
  const rolesQuery = useRoles();
  const myId = useAuthStore((s) => s.user?.id);
  const statusId = useId();
  const [role, setChoice] = useState('');
  // Follow the switch straight away rather than waiting for the list to refresh behind the modal.
  const [enabled, setEnabledView] = useState(true);

  useEffect(() => {
    setChoice('');
    setEnabledView(user?.enabled !== false);
  }, [user?.id, user?.enabled]);

  const name = user ? userDisplayName(user) : '';
  // The roles that really exist (`GET /roles`); the portal's own list stands in if they can't be read.
  const known = Array.isArray(rolesQuery.data) && rolesQuery.data.length > 0 ? rolesQuery.data : null;
  const roleOptions = known
    ? known.map((r) => ({ value: r.roleName, label: BACKEND_ROLE_LABELS[r.roleName] || roleTitle(r.roleName), help: r.description || ROLE_HELP[r.roleName] || `${(r.permissions || []).length} permissions.` }))
    : ASSIGNABLE_ROLES.map((value) => ({ value, label: BACKEND_ROLE_LABELS[value], help: ROLE_HELP[value] }));
  const isMe = !!user && user.id === myId;

  function toggleEnabled() {
    const next = !enabled;
    setEnabledView(next);
    setEnabled.mutate({ id: user.id, enabled: next }, { onError: () => setEnabledView(!next) });
  }

  return (
    <Modal isOpen={!!user} onClose={onClose} title="Edit user" size="md">
      {user && (
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            setRole.mutate({ id: user.id, role }, { onSuccess: onClose });
          }}
        >
          <div className="flex items-center gap-3">
            <Avatar name={name} size="lg" />
            <div className="min-w-0">
              <p className="text-ink font-semibold truncate">{name}</p>
              <p className="text-muted text-xs truncate">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg bg-black/5 px-3 py-3">
            <span className="flex flex-col">
              <span id={statusId} className="text-sm font-medium text-ink">
                Account active
              </span>
              <span className="text-xs text-muted">
                {isMe ? "It's your own account — you can't switch it off." : enabled ? 'On — they can sign in.' : "Off — they can't sign in."}
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-labelledby={statusId}
              disabled={isMe || setEnabled.isPending}
              onClick={toggleEnabled}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed ${
                enabled ? 'bg-accent border-accent' : 'bg-black/10 border-black/20'
              }`}
            >
              <span aria-hidden="true" className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            Role right now:
            {roleBadges(user.roles).map((label) => (
              <Badge key={label} label={label} variant="gold" />
            ))}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-ink mb-2">Give this account the role</legend>
            {roleOptions.map(({ value, label, help }) => {
              const selected = role === value;
              return (
                <label
                  key={value}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-accent ${
                    selected ? 'border-accent bg-accent/10' : 'border-black/10 hover:border-accent/50 hover:bg-black/5'
                  }`}
                >
                  <input type="radio" name="role" value={value} checked={selected} onChange={() => setChoice(value)} className="sr-only" />
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      selected ? 'border-accent bg-accent text-on-accent' : 'border-black/30'
                    }`}
                  >
                    {selected && <Check size={12} />}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-ink">{label}</span>
                    <span className="text-xs text-muted">{help}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <div className="rounded-lg bg-black/5 px-3 py-3 text-xs text-muted flex gap-2" role="note">
            <Info size={15} className="shrink-0 mt-0.5 text-accent" aria-hidden="true" />
            <div className="flex flex-col gap-1.5">
              <p>
                <span className="text-ink font-medium">Permissions</span> come with the role, so the role above is how you grant or take away access.
                To change what a role itself can do, use{' '}
                <Link to="/admin/roles" onClick={onClose} className="text-accent hover:underline focus-ring rounded">
                  Roles &amp; Permissions
                </Link>
                .
              </p>
              <p>
                <span className="text-ink font-medium">Name, phone and other personal details</span> can only be changed by the person
                themselves on their Profile page.
                {isMe && (
                  <>
                    {' '}
                    <Link to="/dashboard/profile" onClick={onClose} className="text-accent hover:underline focus-ring rounded">
                      Edit my details
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button onClick={onClose}>Close</Button>
            <Button type="submit" disabled={!role} loading={setRole.isPending}>
              Save role
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
