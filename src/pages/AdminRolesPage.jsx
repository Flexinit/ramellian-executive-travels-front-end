import React, { useState } from 'react';
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import SegmentedControl from '../components/ui/SegmentedControl';
import Skeleton from '../components/ui/Skeleton';
import PermissionModal from '../components/admin/PermissionModal';
import RoleModal from '../components/admin/RoleModal';
import { useDeletePermission, useDeleteRole, usePermissions, useRoles } from '../hooks/useRolesPermissions';
import { usePagination } from '../hooks/usePagination';
import { BUILT_IN_ROLES, matchesNameSearch, roleTitle } from '../lib/rolesPermissions';

const TABS = [
  { value: 'roles', label: 'Roles' },
  { value: 'permissions', label: 'Permissions' },
];
const SHOWN_CHIPS = 8;

function RoleCard({ role, onEdit, onDelete }) {
  const permissions = Array.isArray(role.permissions) ? [...role.permissions].sort() : [];
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-ink text-lg font-semibold">{roleTitle(role.roleName)}</h2>
          <p className="font-mono text-xs text-muted break-all">{role.roleName}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {BUILT_IN_ROLES.includes(role.roleName) && <Badge label="Built in" variant="neutral" />}
          <Badge label={`${permissions.length} ${permissions.length === 1 ? 'permission' : 'permissions'}`} variant="gold" />
        </div>
      </div>
      {role.description && <p className="text-sm text-muted">{role.description}</p>}
      {permissions.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={`Permissions of ${roleTitle(role.roleName)}`}>
          {permissions.slice(0, SHOWN_CHIPS).map((name) => (
            <li key={name} className="rounded-full border border-ink/10 bg-ink/5 px-2 py-0.5 text-[11px] text-muted">
              {name}
            </li>
          ))}
          {permissions.length > SHOWN_CHIPS && <li className="px-1 py-0.5 text-[11px] text-muted">+{permissions.length - SHOWN_CHIPS} more</li>}
        </ul>
      ) : (
        <p className="text-xs text-muted">No permissions yet.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onEdit(role)} aria-label={`Edit role ${roleTitle(role.roleName)}`}>
          <Pencil size={14} aria-hidden="true" />
          Edit
        </Button>
        <Button size="sm" variant="danger" onClick={() => onDelete(role)} aria-label={`Delete role ${roleTitle(role.roleName)}`}>
          <Trash2 size={14} aria-hidden="true" />
          Delete
        </Button>
      </div>
    </Card>
  );
}

/**
 * Roles & Permissions (`/roles`, `/permissions`): what each role can do, in one place. On **Roles**, edit the permissions a
 * role gives (and its description), add a role, or delete one. On **Permissions**, add, rename or delete the permissions
 * themselves. Giving a person a role is done from Users → Edit. People pick up a role's permissions the next time they log in.
 */
export default function AdminRolesPage() {
  const roles = useRoles();
  const permissions = usePermissions();
  const deleteRole = useDeleteRole();
  const deletePermission = useDeletePermission();
  const [tab, setTab] = useState('roles');
  const [search, setSearch] = useState('');
  const [roleModal, setRoleModal] = useState(null); // null = closed; {} = new; a role = editing it
  const [permissionModal, setPermissionModal] = useState(null);
  const [removing, setRemoving] = useState(null); // { kind: 'role'|'permission', item }

  const roleList = (Array.isArray(roles.data) ? roles.data : []).filter((r) => matchesNameSearch(search, r.roleName, r.description, roleTitle(r.roleName)));
  const permissionList = (Array.isArray(permissions.data) ? permissions.data : [])
    .filter((p) => matchesNameSearch(search, p.permissionName, p.description))
    .sort((a, b) => a.permissionName.localeCompare(b.permissionName));
  const pages = usePagination(permissionList, 10, `${tab}|${search}`);
  const rolePages = usePagination(roleList, 8, `${tab}|${search}`);

  const active = tab === 'roles' ? roles : permissions;
  const removingName = removing ? (removing.kind === 'role' ? removing.item.roleName : removing.item.permissionName) : '';
  const removingBuiltIn = removing?.kind === 'role' && BUILT_IN_ROLES.includes(removing.item.roleName);
  const confirmRemove = () => {
    const done = { onSuccess: () => setRemoving(null) };
    if (removing.kind === 'role') deleteRole.mutate(removing.item.roleName, done);
    else deletePermission.mutate(removing.item.permissionName, done);
  };

  return (
    <PageWrapper className="max-w-5xl">
      <PageTitle title="Roles & Permissions" />
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Roles &amp; Permissions</h1>
            <p className="text-muted text-sm mt-1 max-w-2xl">
              A permission is one thing a person may do; a role is a set of them. Change what a role can do here, and give people roles from Users → Edit.
              People pick up a role&apos;s permissions the next time they log in.
            </p>
          </div>
          <Button onClick={() => (tab === 'roles' ? setRoleModal({}) : setPermissionModal({}))}>
            <Plus size={15} aria-hidden="true" />
            {tab === 'roles' ? 'New role' : 'New permission'}
          </Button>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <SegmentedControl kind="tab" size="sm" label="Roles or permissions" options={TABS} value={tab} onChange={setTab} />
          <Input label="Search" name="search" type="search" placeholder={tab === 'roles' ? 'Role or description' : 'Permission name'} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-72" />
        </div>

        {active.isError && <ErrorBanner message={tab === 'roles' ? "We couldn't load the roles just now." : "We couldn't load the permissions just now."} onRetry={active.refetch} />}

        {active.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : tab === 'roles' ? (
          roleList.length === 0 ? (
            !roles.isError && <EmptyState icon={ShieldCheck} title="No roles found" description="Try a different search, or add a role." />
          ) : (
            <div className="flex flex-col gap-4">
              <ul className="grid gap-4 md:grid-cols-2" aria-label="Roles">
                {rolePages.pageItems.map((role) => (
                  <li key={role.id || role.roleName}>
                    <RoleCard role={role} onEdit={setRoleModal} onDelete={(r) => setRemoving({ kind: 'role', item: r })} />
                  </li>
                ))}
              </ul>
              <Pagination page={rolePages.page} totalPages={rolePages.totalPages} onPage={rolePages.setPage} from={rolePages.from} to={rolePages.to} total={rolePages.total} pageSize={rolePages.pageSize} onPageSize={rolePages.setPageSize} defaultPageSize={rolePages.defaultPageSize} noun="roles" />
            </div>
          )
        ) : permissionList.length === 0 ? (
          !permissions.isError && <EmptyState icon={KeyRound} title="No permissions found" description="Try a different search, or add a permission." />
        ) : (
          <>
            <div className="table-scroll rounded-2xl border border-ink/10">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-ink/10">
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Permission</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">What it allows</th>
                    <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {pages.pageItems.map((p) => (
                    <tr key={p.id || p.permissionName}>
                      <td className="px-4 py-3 font-mono text-xs text-ink break-all">{p.permissionName}</td>
                      <td className="px-4 py-3 text-sm text-muted">{p.description || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => setPermissionModal(p)} aria-label={`Edit permission ${p.permissionName}`}>
                            <Pencil size={14} aria-hidden="true" />
                            Edit
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setRemoving({ kind: 'permission', item: p })} aria-label={`Delete permission ${p.permissionName}`}>
                            <Trash2 size={14} aria-hidden="true" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pages.page} totalPages={pages.totalPages} onPage={pages.setPage} from={pages.from} to={pages.to} total={pages.total} pageSize={pages.pageSize} onPageSize={pages.setPageSize} defaultPageSize={pages.defaultPageSize} noun="permissions" />
          </>
        )}
      </div>

      <RoleModal isOpen={roleModal !== null} role={roleModal?.roleName ? roleModal : null} permissions={Array.isArray(permissions.data) ? permissions.data : []} onClose={() => setRoleModal(null)} />
      <PermissionModal isOpen={permissionModal !== null} permission={permissionModal?.permissionName ? permissionModal : null} onClose={() => setPermissionModal(null)} />

      <Modal isOpen={!!removing} onClose={() => setRemoving(null)} title={removing?.kind === 'role' ? 'Delete role' : 'Delete permission'}>
        <div className="flex flex-col gap-4">
          <p className="text-muted text-sm">
            This can&apos;t be undone. Delete {removing?.kind} <span className="font-mono text-ink">{removingName}</span>?
          </p>
          {removing?.kind === 'permission' && <p className="text-xs text-muted">Roles that have this permission will lose it.</p>}
          {removingBuiltIn && (
            <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-700">
              This is a built-in role the portal relies on. Deleting it can lock people out, including you.
            </p>
          )}
          <div className="flex gap-3 justify-end">
            <Button onClick={() => setRemoving(null)}>Cancel</Button>
            <Button variant="danger" loading={deleteRole.isPending || deletePermission.isPending} onClick={confirmRemove}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
