import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useCreatePermission, useUpdatePermission } from '../../hooks/useRolesPermissions';

/**
 * Create a permission, or edit one (`POST /permissions`, `PUT /permissions/{idOrName}`): its name and what it is for.
 *
 * @param {boolean} isOpen
 * @param {object|null} permission — the permission to edit, or null to create a new one
 * @param {function} onClose
 */
export default function PermissionModal({ isOpen, permission, onClose }) {
  const create = useCreatePermission();
  const update = useUpdatePermission();
  const editing = !!permission;
  const [permissionName, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(permission?.permissionName || '');
      setDescription(permission?.description || '');
    }
  }, [isOpen, permission]);

  function submit(e) {
    e.preventDefault();
    const body = { permissionName: permissionName.trim(), description: description.trim() };
    if (editing) update.mutate({ permission: permission.permissionName, ...body }, { onSuccess: onClose });
    else create.mutate(body, { onSuccess: onClose });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit permission' : 'New permission'}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Input label="Permission name" name="permissionName" placeholder="e.g. VEHICLE_APPROVE" value={permissionName} onChange={(e) => setName(e.target.value)} hint="Capital letters and underscores, starting with what it is about (VEHICLE_, BOOKING_…)." />
        <Input label="What it allows (optional)" name="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex gap-3 justify-end">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending || update.isPending} disabled={!permissionName.trim()}>
            {editing ? 'Save permission' : 'Create permission'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
