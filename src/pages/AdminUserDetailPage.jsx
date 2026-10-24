import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, BadgeCheck, Building2, Car, Check, IdCard, KeyRound, Mail, MapPin, MessageSquare, Pencil, Phone, ShieldCheck, Star, Trash2, UserCheck, UserX, Wallet, X,
} from 'lucide-react';
import { DetailList, DetailRow } from '../components/ui/DetailList';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import AuthImage from '../components/vehicles/AuthImage';
import EditUserModal from '../components/admin/EditUserModal';
import ReviewList from '../components/reviews/ReviewList';
import { useOwnerReviews } from '../hooks/useReviews';
import { useAdminUser, useDeleteUser, useSetUserEnabled } from '../hooks/useAdminUsers';
import { useAuthStore } from '../store/authStore';
import { roleBadges, userDisplayName } from '../lib/adminUsers';
import AdminUploadDocumentCard from '../components/admin/AdminUploadDocumentCard';
import { ratingOrDefault } from '../lib/ratings';

/** `PENDING_VERIFICATION` → `Pending verification`. */
const humanize = (value) => (value ? String(value).replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) : '');

/** A yes/no fact about the account, as a chip that reads at a glance. */
function FactChip({ icon: Icon, label, on, onText = 'Yes', offText = 'No' }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
        on ? 'border-green-500/30 bg-green-500/10' : 'border-ink/10 bg-ink/5'
      }`}
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${on ? 'bg-green-500/20 text-green-600' : 'bg-ink/10 text-muted'}`}>
        <Icon size={17} aria-hidden="true" />
      </span>
      <span className="flex flex-col">
        <span className="text-xs text-muted">{label}</span>
        <span className={`flex items-center gap-1 text-sm font-semibold ${on ? 'text-green-600' : 'text-ink'}`}>
          {on ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />}
          {on ? onText : offText}
        </span>
      </span>
    </div>
  );
}

/** A titled card of label/value rows, each with a small icon; rows with no value are left out, and a card with none isn't shown. */
function InfoCard({ icon: CardIcon, title, rows }) {
  const shown = rows.filter((row) => row.value !== undefined && row.value !== null && row.value !== '');
  if (shown.length === 0) return null;
  return (
    <Card className="p-5 flex flex-col gap-4">
      <h2 className="flex items-center gap-2 font-heading text-ink text-base font-semibold">
        <CardIcon size={17} className="text-accent" aria-hidden="true" />
        {title}
      </h2>
      <DetailList>
        {shown.map(({ icon: Icon, label, value }) => (
          <DetailRow
            key={label}
            label={
              <span className="inline-flex items-start gap-2">
                {Icon && <Icon size={15} className="mt-0.5 shrink-0" aria-hidden="true" />}
                {label}
              </span>
            }
          >
            {value}
          </DetailRow>
        ))}
      </DetailList>
    </Card>
  );
}

/** What this person may do: every permission they have (from their roles and any given directly), as chips. */
function PermissionsCard({ user }) {
  const all = Array.isArray(user.permissions) ? [...user.permissions].sort() : [];
  const direct = Array.isArray(user.directPermissions) ? [...user.directPermissions].sort() : [];
  if (all.length === 0 && direct.length === 0) return null;
  return (
    <Card className="p-5 flex flex-col gap-4 lg:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-ink text-base font-semibold">
          <KeyRound size={17} className="text-accent" aria-hidden="true" />
          Permissions
        </h2>
        <Link to="/admin/roles" className="text-xs font-semibold text-accent hover:underline focus-ring rounded">
          Roles &amp; Permissions
        </Link>
      </div>
      <ul className="flex flex-wrap gap-1.5" aria-label="Permissions this person has">
        {all.map((name) => (
          <li key={name} className="rounded-full border border-ink/10 bg-ink/5 px-2 py-0.5 text-[11px] text-muted">
            {name}
          </li>
        ))}
      </ul>
      {direct.length > 0 && (
        <p className="text-xs text-muted">
          Given to them directly, not through a role: <span className="text-ink">{direct.join(', ')}</span>
        </p>
      )}
    </Card>
  );
}

const ID_IMAGES = [
  ['idNumberUrlFront', 'ID — front'],
  ['idNumberUrlBack', 'ID — back'],
  ['drivingLicenseFrontUrl', 'Driving licence — front'],
  ['drivingLicenseBackUrl', 'Driving licence — back'],
];

/** The identity pictures on the account, as previews that open full size. */
function IdentityCard({ user }) {
  const [zoom, setZoom] = useState(null);
  const images = ID_IMAGES.filter(([field]) => user[field]).map(([field, label]) => ({ label, src: user[field] }));

  return (
    <Card className="p-5 flex flex-col gap-4 lg:col-span-2">
      <h2 className="flex items-center gap-2 font-heading text-ink text-base font-semibold">
        <IdCard size={17} className="text-accent" aria-hidden="true" />
        Identity on file
      </h2>
      {images.length > 0 ? (
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-label="Identity images">
          {images.map(({ label, src }) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => setZoom({ label, src })}
                aria-label={`Open ${label} full size`}
                className="block w-full rounded-xl border border-ink/10 bg-subtle overflow-hidden focus-ring hover:border-accent/50 transition-colors"
              >
                <AuthImage src={src} alt={label} className="h-28 w-full object-cover" fallback={<span className="flex h-28 items-center justify-center px-2 text-xs text-muted">Couldn&apos;t load</span>} />
                <span className="block px-2 py-1.5 text-xs text-muted text-left">{label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          No identity pictures are attached to this profile. Documents people upload are checked under{' '}
          <Link to="/admin/documents" className="text-accent hover:underline focus-ring rounded">
            Review Documents
          </Link>
          .
        </p>
      )}

      <Modal isOpen={!!zoom} onClose={() => setZoom(null)} title={zoom?.label || ''} size="xl">
        {zoom && <AuthImage src={zoom.src} alt={zoom.label} className="max-h-[75vh] max-w-full mx-auto rounded-lg" />}
      </Modal>
    </Card>
  );
}

/**
 * One account (`GET /users/admin/{id}`) laid out for an administrator: a header with who they are and the
 * actions (edit roles, disable/enable, delete), the facts that matter at a glance, then their details grouped
 * into cards. An administrator can't disable or delete their own account from here.
 */
export default function AdminUserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const myId = useAuthStore((s) => s.user?.id);
  const { data: user, isLoading, isError, error, refetch } = useAdminUser(userId);
  const setEnabled = useSetUserEnabled();
  const deleteUser = useDeleteUser();
  const [editingRoles, setEditingRoles] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const ownerReviews = useOwnerReviews(user?.isCarOwner ? user.id : null);

  if (isLoading) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" label="Loading account" />
      </PageWrapper>
    );
  }

  if (isError || !user) {
    return (
      <PageWrapper>
        <ErrorBanner message={error?.response?.data?.message || 'Could not load this account.'} onRetry={refetch} />
      </PageWrapper>
    );
  }

  const isMe = user.id === myId;
  const name = userDisplayName(user);
  const isBusiness = user.ownerType === 'BUSINESS';

  return (
    <PageWrapper className="max-w-5xl">
      <PageTitle title={name} />
      <div className="flex flex-col gap-6">
        <Button to="/admin/users" size="sm" className="self-start">
          <ArrowLeft size={14} aria-hidden="true" />
          All users
        </Button>

        <Card className="p-5 sm:p-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between bg-gradient-to-br from-accent/10 via-transparent to-transparent">
          <div className="flex items-center gap-4 min-w-0">
            {user.profilePhotoUrl ? (
              <AuthImage
                src={user.profilePhotoUrl}
                alt={name}
                className="h-20 w-20 rounded-full object-cover border border-accent/40 shrink-0"
                fallback={<Avatar name={name} size="xl" />}
              />
            ) : (
              <Avatar name={name} size="xl" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold break-words">{name}</h1>
                <Badge label={user.enabled ? 'Active' : 'Disabled'} variant={user.enabled ? 'success' : 'danger'} />
              </div>
              <p className="text-muted text-sm mt-0.5 break-all">{user.email}</p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {roleBadges(user.roles).map((label) => (
                  <Badge key={label} label={label} variant="gold" />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end lg:shrink-0">
            {!isMe && (
              <Button size="sm" to={`/messages/user/${user.id}`}>
                <MessageSquare size={14} aria-hidden="true" />
                Message
              </Button>
            )}
            <Button size="sm" onClick={() => setEditingRoles(true)}>
              <Pencil size={14} aria-hidden="true" />
              Edit
            </Button>
            <Button
              size="sm"
              disabled={isMe}
              loading={setEnabled.isPending}
              onClick={() => setEnabled.mutate({ id: user.id, enabled: !user.enabled })}
            >
              {user.enabled ? <UserX size={14} aria-hidden="true" /> : <UserCheck size={14} aria-hidden="true" />}
              {user.enabled ? 'Disable account' : 'Enable account'}
            </Button>
            <Button size="sm" variant="danger" disabled={isMe} onClick={() => setConfirmingDelete(true)}>
              <Trash2 size={14} aria-hidden="true" />
              Delete account
            </Button>
          </div>
        </Card>
        {isMe && <p className="text-xs text-muted -mt-3">This is your own account — you can&apos;t disable or delete it, and changing your role could lock you out of the admin pages.</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" aria-label="At a glance">
          <FactChip icon={Mail} label="Email" on={user.emailVerified} onText="Verified" offText="Not verified" />
          <FactChip icon={ShieldCheck} label="Two-factor sign-in" on={user.twoFactorEnabled} onText="On" offText="Off" />
          <FactChip icon={BadgeCheck} label="Profile" on={user.hasCompletedProfile} onText="Completed" offText="Not completed" />
          <FactChip icon={Car} label="Vehicles" on={user.isCarOwner && user.hasAddedVehicleToProfile} onText="Has added vehicles" offText={user.isCarOwner ? 'None added yet' : 'Not an owner'} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <InfoCard
            icon={Mail}
            title="Contact"
            rows={[
              { icon: Phone, label: 'Phone', value: user.phoneNumber },
              { icon: MapPin, label: 'Location', value: user.location },
            ]}
          />
          <InfoCard
            icon={IdCard}
            title="Account"
            rows={[
              { label: 'Account type', value: humanize(user.ownerType) },
              { label: 'ID number', value: user.idNumber },
              { label: 'Two-factor method', value: user.twoFactorEnabled ? humanize(user.twoFactorMethod) : '' },
              { icon: Star, label: 'Rating', value: ratingOrDefault(user.rating).toFixed(1) },
            ]}
          />
          {(isBusiness || user.businessName) && (
            <InfoCard
              icon={Building2}
              title="Business"
              rows={[
                { label: 'Name', value: user.businessName },
                { label: 'Registration no.', value: user.businessRegistrationNumber },
                { label: 'Tax no.', value: user.businessTaxNumber },
                { label: 'Address', value: user.businessAddress },
              ]}
            />
          )}
          <InfoCard
            icon={Wallet}
            title="Payouts"
            rows={[
              { label: 'Provider', value: humanize(user.payoutProvider) },
              { label: 'Status', value: humanize(user.payoutStatus) },
            ]}
          />
          <PermissionsCard user={user} />
          <IdentityCard user={user} />
          <AdminUploadDocumentCard userId={user.id || userId} />
          {user.isCarOwner && (
            <Card className="p-5 flex flex-col gap-4 lg:col-span-2">
              <h2 className="flex items-center gap-2 font-heading text-ink text-base font-semibold">
                <Star size={17} className="text-accent" aria-hidden="true" />
                What renters say
              </h2>
              <ReviewList reviews={ownerReviews.data} isLoading={ownerReviews.isLoading} showComplaints emptyText="No reviews of this owner yet" />
            </Card>
          )}
        </div>
      </div>

      <EditUserModal user={editingRoles ? user : null} onClose={() => setEditingRoles(false)} />

      <Modal isOpen={confirmingDelete} onClose={() => setConfirmingDelete(false)} title="Delete account">
        <div className="flex flex-col gap-4">
          <p className="text-muted text-sm">
            This can&apos;t be undone. Delete the account for <span className="text-ink">{name}</span>?
          </p>
          <div className="flex gap-3 justify-end">
            <Button onClick={() => setConfirmingDelete(false)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleteUser.isPending}
              onClick={() =>
                deleteUser.mutate(user.id, {
                  onSuccess: () => {
                    setConfirmingDelete(false);
                    navigate('/admin/users', { replace: true });
                  },
                })
              }
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
