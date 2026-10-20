import React, { useState } from 'react';
import { ArrowLeft, CarFront, CheckCircle2, Clock, XCircle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import Input from '../components/ui/Input';
import Pagination from '../components/ui/Pagination';
import SegmentedControl from '../components/ui/SegmentedControl';
import Skeleton from '../components/ui/Skeleton';
import StatTile from '../components/reports/StatTile';
import VehicleReviewCard from '../components/admin/VehicleReviewCard';
import { useAdminVehicles } from '../hooks/useVehicles';
import { usePagination } from '../hooks/usePagination';
import { matchesApprovalFilter } from '../lib/vehicleApproval';

const PAGE_SIZE = 5;

const matchesSearch = (vehicle, text) => {
  const needle = text.trim().toLowerCase();
  if (!needle) return true;
  return [vehicle.model, vehicle.registrationNumber, vehicle.ownerEmail, vehicle.location, vehicle.vin].some((f) => String(f || '').toLowerCase().includes(needle));
};

/**
 * The three approval pages, one component:
 *  - `review` — Vehicle Approvals: what needs a decision, with counts, tabs to see the other groups, and a search;
 *  - `approved` — Approved Vehicles: every vehicle an administrator has approved (the ones renters can see);
 *  - `rejected` — Rejected Vehicles: every vehicle that was rejected, with the reason the owner was given.
 * All read `GET /vehicles/admin/all` and decide with `PUT /vehicles/admin/{id}/review`, five vehicles to a page, searchable.
 * A vehicle added before approval existed has no status and counts as "needs review", like a new one. On the approved and
 * rejected pages a decision can be changed with **Reject instead** / **Approve instead**.
 *
 * @param {'review'|'approved'|'rejected'} view
 */
const VIEWS = {
  review: {
    filter: 'REVIEW',
    title: 'Vehicle Approvals',
    intro: 'New vehicles are listed only once an administrator approves them. Check the details, photos and insurance sticker, then approve or reject with a note for the owner.',
  },
  approved: {
    filter: 'APPROVED',
    title: 'Approved Vehicles',
    intro: 'Every vehicle you have approved — these are the ones renters can see. Changed your mind? Use Reject instead.',
    empty: 'No vehicle has been approved yet.',
  },
  rejected: {
    filter: 'REJECTED',
    title: 'Rejected Vehicles',
    intro: 'Every vehicle that was rejected, with the note the owner was given. If it should have been accepted, use Approve instead.',
    empty: 'No vehicle has been rejected.',
  },
};

export default function AdminVehicleApprovalsPage({ view = 'review' }) {
  const config = VIEWS[view] || VIEWS.review;
  const isReview = view === 'review' || !VIEWS[view];
  const { data, isLoading, isError, refetch } = useAdminVehicles();
  const [tab, setTab] = useState('REVIEW');
  const [search, setSearch] = useState('');
  const filter = isReview ? tab : config.filter;
  const all = Array.isArray(data) ? data : [];
  const count = (f) => all.filter((v) => matchesApprovalFilter(v, f)).length;
  const shown = all.filter((v) => matchesApprovalFilter(v, filter) && matchesSearch(v, search));
  const pages = usePagination(shown, PAGE_SIZE, `${filter}|${search}`);

  const tabs = [
    { value: 'REVIEW', label: `Needs review · ${count('REVIEW')}` },
    { value: 'APPROVED', label: `Approved · ${count('APPROVED')}` },
    { value: 'REJECTED', label: `Rejected · ${count('REJECTED')}` },
    { value: 'ALL', label: `All · ${all.length}` },
  ];

  return (
    <PageWrapper className="max-w-5xl">
      <PageTitle title={config.title} />
      <div className="flex flex-col gap-8">
        <div>
          {!isReview && (
            <Button to="/admin/vehicles/approvals" size="sm" className="mb-4">
              <ArrowLeft size={14} aria-hidden="true" />
              Vehicle Approvals
            </Button>
          )}
          <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">{config.title}</h1>
          <p className="text-brand-grey text-sm mt-1 max-w-2xl">{config.intro}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isReview ? (
            <>
              <StatTile icon={Clock} label="Needs review" value={count('REVIEW')} loading={isLoading} />
              <StatTile icon={CheckCircle2} label="Approved" value={count('APPROVED')} loading={isLoading} to="/admin/vehicles/approved" />
              <StatTile icon={XCircle} label="Rejected" value={count('REJECTED')} loading={isLoading} to="/admin/vehicles/rejected" />
              <StatTile icon={CarFront} label="All vehicles" value={all.length} loading={isLoading} to="/admin/vehicles" />
            </>
          ) : (
            <>
              <StatTile icon={view === 'approved' ? CheckCircle2 : XCircle} label={view === 'approved' ? 'Approved' : 'Rejected'} value={count(filter)} loading={isLoading} />
              <StatTile icon={Clock} label="Needs review" value={count('REVIEW')} loading={isLoading} to="/admin/vehicles/approvals" />
            </>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {isReview ? <SegmentedControl kind="tab" size="sm" label="Approval status" options={tabs} value={filter} onChange={setTab} /> : <span />}
            <Input label="Search" name="search" type="search" placeholder="Model, registration, owner…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-72" />
          </div>

          {isError && <ErrorBanner message="We couldn't load the vehicles just now." onRetry={refetch} />}

          {isLoading ? (
            <div className="flex flex-col gap-4" aria-hidden="true">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-56 w-full" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            !isError && (
              <EmptyState
                icon={CarFront}
                title={filter === 'REVIEW' && !search ? 'Nothing to review' : 'No vehicles here'}
                description={
                  search
                    ? 'Try a different search.'
                    : filter === 'REVIEW'
                      ? 'Every vehicle has been decided.'
                      : config.empty || 'Try a different group.'
                }
              />
            )
          ) : (
            <>
              <ul className="flex flex-col gap-4" aria-label="Vehicles">
                {pages.pageItems.map((vehicle) => (
                  <li key={vehicle.id}>
                    <VehicleReviewCard vehicle={vehicle} />
                  </li>
                ))}
              </ul>
              <Pagination page={pages.page} totalPages={pages.totalPages} onPage={pages.setPage} from={pages.from} to={pages.to} total={pages.total} noun="vehicles" />
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
