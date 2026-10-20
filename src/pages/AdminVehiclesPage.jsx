import React, { useState } from 'react';
import { Car, Plus, ShieldCheck } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import SegmentedControl from '../components/ui/SegmentedControl';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import InsuranceStickerReview from '../components/admin/InsuranceStickerReview';
import VehicleThumb from '../components/admin/VehicleThumb';
import AuthImage from '../components/vehicles/AuthImage';
import Pagination from '../components/ui/Pagination';
import { usePagination } from '../hooks/usePagination';
import { useAdminVehicles, useDeleteVehicle, useSetVehicleAvailability } from '../hooks/useVehicles';
import { APPROVAL_FILTERS, approvalLabel, approvalVariant, matchesApprovalFilter } from '../lib/vehicleApproval';
import { formatCurrency } from '../lib/utils';

const matches = (vehicle, text) => {
  const needle = text.trim().toLowerCase();
  if (!needle) return true;
  return [vehicle.model, vehicle.registrationNumber, vehicle.ownerEmail, vehicle.location].some((f) => String(f || '').toLowerCase().includes(needle));
};

/**
 * All Vehicles (`GET /vehicles`, `PUT /vehicles/{id}`, `DELETE /vehicles/{id}`): every vehicle on the
 * platform, whether or not renters can see it, with whose it is. An administrator can put one on or off
 * the market or remove it.
 */
export default function AdminVehiclesPage() {
  const { data, isLoading, isError, refetch } = useAdminVehicles();
  const setAvailability = useSetVehicleAvailability();
  const deleteVehicle = useDeleteVehicle();
  const [search, setSearch] = useState('');
  // Defaults to ALL (unfiltered) — unlike AdminVehicleApprovalsPage's own REVIEW default, this page's whole
  // purpose is to be the complete list; the tabs narrow it down on request, same as BookingStatusTabs does
  // for the bookings pages, rather than hiding anything by default.
  const [approvalFilter, setApprovalFilter] = useState('ALL');
  const [removing, setRemoving] = useState(null);
  const [sticker, setSticker] = useState(null);
  const [gallery, setGallery] = useState(null);

  const all = Array.isArray(data) ? data : [];
  const count = (f) => all.filter((v) => matchesApprovalFilter(v, f)).length;
  const tabs = APPROVAL_FILTERS.map((f) => ({ value: f.value, label: `${f.label} · ${count(f.value)}` }));
  const shown = all.filter((v) => matchesApprovalFilter(v, approvalFilter) && matches(v, search));
  const pages = usePagination(shown, 10, `${approvalFilter}|${search}`);

  return (
    <PageWrapper>
      <PageTitle title="All Vehicles" />
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">All Vehicles</h1>
            <p className="text-brand-grey text-sm mt-1">Every vehicle on the platform and who owns it.</p>
            <p className="text-brand-grey text-xs mt-1 max-w-2xl">
              New vehicles need approval before renters see them — decide on them under <strong className="text-brand-white font-medium">Vehicle Approvals</strong>.
              Photos: the backend doesn&apos;t list a vehicle&apos;s photos (a photo&apos;s address is only revealed to whoever uploads it), so the
              pictures shown are the ones uploaded from this browser. The insurance sticker is stored with the vehicle, so it shows for any
              vehicle that has one.
            </p>
          </div>
          <Button to="/admin/vehicles/new">
            <Plus size={15} aria-hidden="true" />
            Add Vehicle
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl kind="tab" size="sm" label="Approval status" options={tabs} value={approvalFilter} onChange={setApprovalFilter} />
          <Input
            label="Search"
            name="search"
            type="search"
            placeholder="Model, registration, owner or place"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72"
          />
        </div>

        {isError && <ErrorBanner message="We couldn't load the vehicles just now." onRetry={refetch} />}

        {isLoading ? (
          <div className="flex flex-col gap-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          !isError && <EmptyState icon={Car} title="No vehicles found" description="Try a different search or status." />
        ) : (
          <Card className="table-scroll">
            <table className="stack-table w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  {['Vehicle', 'Owner', 'Place', 'Per day', 'Insurance', 'Approval', 'Status', ''].map((col, i) => (
                    <th key={col || i} scope="col" className="px-4 py-3 text-xs font-semibold text-brand-grey uppercase tracking-wider">
                      {col || <span className="sr-only">Actions</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pages.pageItems.map((v) => (
                  <tr key={v.id}>
                    <td className="stack-full px-4 py-3 text-sm text-brand-white">
                      <div className="flex items-center gap-3">
                        <VehicleThumb vehicle={v} onOpen={setGallery} />
                        <span>
                          {v.model}
                          <span className="block text-xs text-brand-grey">{v.registrationNumber}</span>
                        </span>
                      </div>
                    </td>
                    <td data-label="Owner" className="stack-full px-4 py-3 text-sm text-brand-grey break-all md:break-normal">{v.ownerEmail || '—'}</td>
                    <td data-label="Place" className="px-4 py-3 text-sm text-brand-grey">{v.location}</td>
                    <td data-label="Per day" className="px-4 py-3 text-sm text-brand-white">{formatCurrency(v.pricePerDay)}</td>
                    <td data-label="Insurance" className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge
                          label={!v.comprehensiveInsurance ? 'No insurance' : v.insuranceVerificationStickerPhoto ? 'Insured · sticker' : 'Insured · no sticker'}
                          variant={!v.comprehensiveInsurance ? 'danger' : v.insuranceVerificationStickerPhoto ? 'success' : 'warning'}
                        />
                        {v.insuranceVerificationStickerPhoto && (
                          <button
                            type="button"
                            onClick={() => setSticker(v)}
                            aria-label={`View insurance sticker: ${v.model}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-gold hover:text-brand-gold-light focus-ring rounded"
                          >
                            <ShieldCheck size={12} aria-hidden="true" />
                            View sticker
                          </button>
                        )}
                      </div>
                    </td>
                    <td data-label="Approval" className="px-4 py-3">
                      <Badge label={approvalLabel(v)} variant={approvalVariant(v)} />
                    </td>
                    <td data-label="Status" className="px-4 py-3">
                      <Badge label={v.available === false ? 'Unavailable' : 'Available'} variant={v.available === false ? 'neutral' : 'success'} />
                    </td>
                    <td className="stack-full px-4 py-3">
                      <div className="flex flex-wrap gap-2 md:flex-nowrap md:justify-end">
                        <Button size="sm" to={`/admin/vehicles/${v.id}/edit`} aria-label={`Edit ${v.model}`}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          aria-label={`${v.available === false ? 'Make available' : 'Make unavailable'}: ${v.model}`}
                          disabled={setAvailability.isPending && setAvailability.variables?.vehicle?.id === v.id}
                          onClick={() => setAvailability.mutate({ vehicle: v, available: v.available === false })}
                        >
                          {v.available === false ? 'Make available' : 'Make unavailable'}
                        </Button>
                        <Button size="sm" variant="danger" aria-label={`Remove ${v.model}`} onClick={() => setRemoving(v)}>
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <Pagination page={pages.page} totalPages={pages.totalPages} onPage={pages.setPage} from={pages.from} to={pages.to} total={pages.total} noun="vehicles" />
      </div>

      <Modal isOpen={!!gallery} onClose={() => setGallery(null)} title={gallery ? `Photos — ${gallery.model} (${gallery.registrationNumber})` : ''} size="xl">
        {gallery && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label={`Photos of ${gallery.model}`}>
            {(gallery.photos || []).map((photo, i) => (
              <li key={photo.url || i} className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
                <AuthImage
                  src={photo.url}
                  alt={`${gallery.model} — photo ${i + 1}`}
                  className="w-full max-h-96 object-contain"
                  fallback={<p className="p-6 text-sm text-red-400 text-center">Couldn&apos;t load this photo.</p>}
                />
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal isOpen={!!sticker} onClose={() => setSticker(null)} title={sticker ? `Insurance sticker — ${sticker.model} (${sticker.registrationNumber})` : ''} size="xl">
        {sticker && <InsuranceStickerReview vehicle={sticker} />}
      </Modal>

      <Modal isOpen={!!removing} onClose={() => setRemoving(null)} title="Remove vehicle">
        <div className="flex flex-col gap-4">
          <p className="text-brand-grey text-sm">
            This can&apos;t be undone. Remove <span className="text-brand-white">{removing?.model}</span> ({removing?.registrationNumber}) from the platform?
          </p>
          <div className="flex gap-3 justify-end">
            <Button onClick={() => setRemoving(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleteVehicle.isPending}
              onClick={() => deleteVehicle.mutate(removing, { onSuccess: () => setRemoving(null) })}
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
