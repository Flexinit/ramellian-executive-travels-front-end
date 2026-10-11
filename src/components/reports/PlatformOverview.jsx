import React from 'react';
import { BadgeCheck, Car, CarFront, FileClock, MapPin, ShieldCheck, ShieldOff, UserCheck, UserX, Users, Wallet, Wifi } from 'lucide-react';
import StatTile from './StatTile';
import Card from '../ui/Card';
import ErrorBanner from '../ui/ErrorBanner';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { usePendingDocuments } from '../../hooks/useAdminDocuments';
import { useRecentSignIns } from '../../hooks/useAuditLogs';
import { useAdminVehicles } from '../../hooks/useVehicles';
import { needsReview } from '../../lib/vehicleApproval';
import { recentSignIns, SESSION_MINUTES, userStats, vehicleStats } from '../../lib/platformStats';
import { formatCurrency } from '../../lib/utils';

function Section({ title, children, note }) {
  const id = `${title.replace(/\W+/g, '-').toLowerCase()}-heading`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="font-heading text-brand-white text-lg font-semibold">
        {title}
      </h2>
      {children}
      {note && <p className="text-brand-grey text-xs">{note}</p>}
    </section>
  );
}

const minutesAgo = (iso, now) => {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  return minutes < 1 ? 'just now' : minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
};

/**
 * Who has signed in recently — split out of what used to be one long `PlatformOverview` so the Platform
 * Reports page can show it as its own tab instead of one more stretch of a single endless scroll. Loads (and
 * can fail) independently of the other sections.
 */
export function SignedInSection() {
  const signIns = useRecentSignIns();
  const now = Date.now();
  const recent = recentSignIns(signIns.data, now, SESSION_MINUTES);
  const today = recentSignIns(signIns.data, now, 24 * 60);
  // The audit log is read 200 entries at a time; if all of them are inside the window there may be more.
  const capped = (signIns.data || []).length >= 200 && recent.length > 0;

  return (
    <Section
      title="Signed in recently"
      note={`The backend records sign-ins but not sign-outs and has no live-connection count, so this is everyone who signed in within the last ${SESSION_MINUTES} minutes (the life of a login) — not a count of open browsers. Refreshes every minute.`}
    >
      {signIns.isError ? (
        <ErrorBanner message="We couldn't read the sign-in history just now." onRetry={signIns.refetch} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_1fr]">
          <StatTile
            icon={Wifi}
            label={`Signed in, last ${SESSION_MINUTES} minutes`}
            value={`${capped ? 'At least ' : ''}${recent.length}`}
            detail={`${today.length} in the last 24 hours`}
            loading={signIns.isLoading}
          />
          <Card className="p-5">
            {recent.length === 0 ? (
              <p className="text-sm text-brand-grey">{signIns.isLoading ? 'Loading…' : 'Nobody has signed in during the last hour.'}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-white/5" aria-label="People signed in recently">
                {recent.slice(0, 10).map((person) => (
                  <li key={person.email} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-brand-white break-all">{person.email}</span>
                    <span className="text-brand-grey text-xs shrink-0">{minutesAgo(person.at, now)}</span>
                  </li>
                ))}
                {recent.length > 10 && <li className="pt-2 text-xs text-brand-grey">and {recent.length - 10} more</li>}
              </ul>
            )}
          </Card>
        </div>
      )}
    </Section>
  );
}

/** Account counts by role/status — its own tab, same reasoning as `SignedInSection`. */
export function PeopleSection() {
  const users = useAdminUsers();
  const u = userStats(Array.isArray(users.data) ? users.data : []);

  return (
    <Section title="People">
      {users.isError ? (
        <ErrorBanner message="We couldn't load the accounts just now." onRetry={users.refetch} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile icon={Users} label="Accounts" value={u.total} loading={users.isLoading} to="/admin/users" />
          <StatTile icon={UserCheck} label="Active" value={u.active} loading={users.isLoading} />
          <StatTile icon={UserX} label="Disabled" value={u.disabled} loading={users.isLoading} />
          <StatTile icon={BadgeCheck} label="Email verified" value={u.emailVerified} loading={users.isLoading} detail={`${u.profileCompleted} profiles completed`} />
          <StatTile icon={Users} label="Renters" value={u.roles.renters} loading={users.isLoading} />
          <StatTile icon={CarFront} label="Car owners" value={u.roles.owners} loading={users.isLoading} />
          <StatTile icon={Users} label="Fleet managers" value={u.roles.managers} loading={users.isLoading} />
          <StatTile icon={ShieldCheck} label="Admins" value={u.roles.admins} loading={users.isLoading} detail={`${u.twoFactor} with two-factor on`} />
        </div>
      )}
      <p className="text-brand-grey text-xs">An account counts under every role it holds, so the role numbers can add up to more than the total.</p>
    </Section>
  );
}

/** Vehicle counts, insurance, pricing, and documents waiting — its own tab, same reasoning as `SignedInSection`. */
export function VehiclesSection() {
  const vehicles = useAdminVehicles();
  const pending = usePendingDocuments();
  const vehicleList = Array.isArray(vehicles.data) ? vehicles.data : [];
  const awaitingApproval = vehicleList.filter(needsReview).length;
  const v = vehicleStats(vehicleList);

  return (
    <Section title="Vehicles" note="Every vehicle on the platform, including ones switched off or not yet approved.">
      {vehicles.isError ? (
        <ErrorBanner message="We couldn't load the vehicles just now." onRetry={vehicles.refetch} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile icon={Car} label="Vehicles" value={v.total} loading={vehicles.isLoading} to="/admin/vehicles" />
            <StatTile icon={CarFront} label="Awaiting approval" value={awaitingApproval} loading={vehicles.isLoading} to="/admin/vehicles/approvals" />
            <StatTile icon={Car} label="Available to book" value={v.available} loading={vehicles.isLoading} detail={`${v.unavailable} switched off`} />
            <StatTile icon={ShieldCheck} label="Insured" value={v.insured} loading={vehicles.isLoading} detail={`${v.insuredWithSticker} with a sticker photo`} />
            <StatTile icon={ShieldOff} label="Not insured" value={v.notInsured} loading={vehicles.isLoading} />
            <StatTile icon={Car} label="Self-drive" value={v.selfDrive} loading={vehicles.isLoading} />
            <StatTile icon={CarFront} label="Chauffeured" value={v.chauffeured} loading={vehicles.isLoading} />
            <StatTile icon={Wallet} label="Average per day" value={formatCurrency(v.averagePerDay)} loading={vehicles.isLoading} />
            <StatTile icon={FileClock} label="Documents to review" value={Array.isArray(pending.data) ? pending.data.length : '—'} loading={pending.isLoading} to="/admin/documents" />
          </div>
          {v.locations.length > 0 && (
            <Card className="p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-white mb-3">
                <MapPin size={15} className="text-brand-gold" aria-hidden="true" />
                Vehicles by place
              </h3>
              <ul className="flex flex-wrap gap-2" aria-label="Vehicles by place">
                {v.locations.slice(0, 8).map((place) => (
                  <li key={place.name} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-brand-grey">
                    {place.name} <span className="text-brand-white font-semibold ml-1">{place.count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </Section>
  );
}

/**
 * The platform-wide picture for the admin report, besides bookings: people, vehicles, and who has signed in
 * recently, all at once. Each part loads (and can fail) on its own, so one missing permission doesn't blank
 * the rest. Everything comes from lists the backend already gives an administrator — see lib/platformStats.js.
 * Kept for anything that still wants the whole picture in one place; `AdminReportsPage` itself now renders
 * `SignedInSection`/`PeopleSection`/`VehiclesSection` separately, one per tab.
 */
export default function PlatformOverview() {
  return (
    <div className="flex flex-col gap-8">
      <SignedInSection />
      <PeopleSection />
      <VehiclesSection />
    </div>
  );
}
