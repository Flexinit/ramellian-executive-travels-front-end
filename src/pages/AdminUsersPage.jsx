import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Users, UserPlus } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import EditUserModal from '../components/admin/EditUserModal';
import AddRenterModal from '../components/admin/AddRenterModal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import Pagination from '../components/ui/Pagination';
import { usePagination } from '../hooks/usePagination';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { matchesUserSearch, roleBadges, userDisplayName } from '../lib/adminUsers';
import { ASSIGNABLE_ROLES, BACKEND_ROLE_LABELS } from '../lib/constants';

const ROLE_FILTER_OPTIONS = ASSIGNABLE_ROLES.map((role) => ({ value: role, label: BACKEND_ROLE_LABELS[role] || role }));

/** A plain renter account has no role at all, so "Car Renter" also matches an empty role list. */
function hasRole(user, role) {
  const roles = user.roles || [];
  return role === 'CAR_RENTER' ? roles.length === 0 || roles.includes(role) : roles.includes(role);
}

/**
 * User management (`GET /users/admin`): every account, searchable and filterable by role. A row opens
 * the account's page, where an administrator switches it on or off, changes its role or deletes it.
 */
export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { data: users, isLoading, isError, refetch } = useAdminUsers();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  const shown = (Array.isArray(users) ? users : []).filter((u) => matchesUserSearch(u, search) && (!role || hasRole(u, role)));
  const pages = usePagination(shown, 10, `${search}|${role}`);

  return (
    <PageWrapper>
      <PageTitle title="Users" />
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Users</h1>
            <p className="text-muted text-sm mt-1">Every account on the platform. Use Edit to change someone's role or switch their account on or off, or open a row for their full details.</p>
          </div>
          <Button onClick={() => setAdding(true)}>
            <UserPlus size={15} aria-hidden="true" /> Add a renter
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Search"
            name="search"
            type="search"
            placeholder="Name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72"
          />
          <Select
            label="Role"
            name="role"
            options={ROLE_FILTER_OPTIONS}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="All roles"
            className="w-full sm:w-48"
          />
          {!isLoading && Array.isArray(users) && (
            <p className="text-muted text-sm sm:ml-auto pb-2.5" aria-live="polite">
              {shown.length} of {users.length} {users.length === 1 ? 'account' : 'accounts'}
            </p>
          )}
        </div>

        {isError && <ErrorBanner message="We couldn't load the accounts just now." onRetry={refetch} />}

        {isLoading ? (
          <div className="flex flex-col gap-2" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          !isError && <EmptyState icon={Users} title="No accounts found" description="Try a different search or role." />
        ) : (
          <div className="flex flex-col gap-4">
          <div className="table-scroll rounded-2xl border border-ink/10">
            <table className="stack-table w-full text-left">
              <thead>
                <tr className="border-b border-ink/10">
                  {['Name', 'Email', 'Roles', 'Status', ''].map((col, i) => (
                    <th key={col || i} scope="col" className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                      {col || <span className="sr-only">Actions</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {pages.pageItems.map((user) => {
                  const open = () => navigate(`/admin/users/${user.id}`);
                  return (
                    <tr
                      key={user.id}
                      tabIndex={0}
                      onClick={open}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') open();
                      }}
                      aria-label={`Open ${userDisplayName(user)}`}
                      className="cursor-pointer hover:bg-ink/5 transition-colors focus-ring"
                    >
                      <td className="stack-full px-4 py-3 text-sm text-ink">
                        <span className="flex items-center gap-3">
                          <Avatar name={userDisplayName(user)} size="sm" />
                          {userDisplayName(user)}
                        </span>
                      </td>
                      <td data-label="Email" className="stack-full px-4 py-3 text-sm text-muted break-all md:break-normal">{user.email}</td>
                      <td data-label="Roles" className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {roleBadges(user.roles).map((label) => (
                            <Badge key={label} label={label} variant="gold" />
                          ))}
                        </div>
                      </td>
                      <td data-label="Status" className="px-4 py-3">
                        <Badge label={user.enabled ? 'Active' : 'Disabled'} variant={user.enabled ? 'success' : 'danger'} />
                      </td>
                      <td className="stack-full px-4 py-3 text-right">
                        <Button
                          size="sm"
                          aria-label={`Edit ${userDisplayName(user)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(user);
                          }}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <Pencil size={14} aria-hidden="true" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={pages.page} totalPages={pages.totalPages} onPage={pages.setPage} from={pages.from} to={pages.to} total={pages.total} noun="accounts" />
          </div>
        )}
      </div>

      <EditUserModal user={editing} onClose={() => setEditing(null)} />
      <AddRenterModal isOpen={adding} onClose={() => setAdding(false)} />
    </PageWrapper>
  );
}
