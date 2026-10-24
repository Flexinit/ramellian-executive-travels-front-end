import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import PermissionPicker from './PermissionPicker';
import { useCreateRole, useUpdateRole } from '../../hooks/useRolesPermissions';
import { BUILT_IN_ROLES, roleTitle } from '../../lib/rolesPermissions';

/**
 * Create a role, or edit one: its description and the permissions it gives (`POST /roles`, `PUT /roles/{idOrName}`). The
 * permissions are chosen from every permission that exists. A role's name can't be changed once it exists.
 * People get a role's permissions in their login token, so a change reaches someone the next time they log in.
 *
 * @param {boolean} isOpen
 * @param {object|null} role — the role to edit, or null to create a new one
 * @param {Array<{ permissionName: string, description?: string }>} permissions — every permission that exists
 * @param {function} onClose
 */
export default function RoleModal({ isOpen, role, permissions, onClose }) {
  const create = useCreateRole();
  const update = useUpdateRole();
  const editing = !!role;
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [chosen, setChosen] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setRoleName(role?.roleName || '');
      setDescription(role?.description || '');
      setChosen(Array.isArray(role?.permissions) ? role.permissions : []);
    }
  }, [isOpen, role]);

  const pending = create.isPending || update.isPending;
  const builtIn = editing && BUILT_IN_ROLES.includes(role.roleName);

  function submit(e) {
    e.preventDefault();
    const body = { description: description.trim(), permissions: chosen };
    if (editing) update.mutate({ role: role.roleName, ...body }, { onSuccess: onClose });
    else create.mutate({ roleName: roleName.trim(), ...body }, { onSuccess: onClose });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? `Edit role — ${roleTitle(role.roleName)}` : 'New role'} size="xl">
      <form onSubmit={submit} className="flex flex-col gap-5">
        {editing ? (
          <p className="text-sm text-muted">
            Role name <span className="font-mono text-ink">{role.roleName}</span> (it can&apos;t be renamed).
          </p>
        ) : (
          <Input label="Role name" name="roleName" placeholder="e.g. FLEET_SUPERVISOR" value={roleName} onChange={(e) => setRoleName(e.target.value)} hint="Capital letters and underscores, like the built-in roles." />
        )}
        <Textarea label="Description (optional)" name="description" rows={2} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-ink">Permissions</span>
            <span className="text-xs text-muted" aria-live="polite">
              {chosen.length} chosen
            </span>
          </div>
          <PermissionPicker available={permissions} value={chosen} onChange={setChosen} disabled={pending} />
        </div>

        {builtIn && (
          <p role="note" className="rounded-lg bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700">
            This is a built-in role the portal relies on. Changing its permissions changes what everyone who holds it can do, from their next login.
          </p>
        )}

        {/* Pinned to the bottom of the window, so Save is always in reach however long the grid is. */}
        <div className="sticky bottom-0 -mx-6 -mb-5 flex justify-end gap-3 border-t border-ink/10 bg-surface px-6 py-4">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={pending} disabled={!editing && !roleName.trim()}>
            {editing ? 'Save role' : 'Create role'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
