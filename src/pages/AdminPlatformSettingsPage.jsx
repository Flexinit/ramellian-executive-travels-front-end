import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import BookingPolicyForm from '../components/booking/BookingPolicyForm';
import { usePlatformPolicy, useSavePlatformPolicy } from '../hooks/useBookingPolicies';
import { usePlatformSettings, useSavePlatformSettings } from '../hooks/usePlatformSettings';

const FIELDS = ['commissionRatePct', 'pesapalTransactionFeeRatePct', 'deliveryFlatFee'];

/**
 * Platform-wide settings — `GET`/`PUT /platform-settings/commission` (docs/backend-requests.md item 26):
 * the commission rate, the Pesapal transaction fee rate and the flat fee for delivering a vehicle to a renter
 * (live spec 2026-10-09). `POST /bookings/quote` applies all three, so a change here reprices every future
 * quote and booking. They're saved together, since the `PUT` replaces the settings as a whole.
 */
export default function AdminPlatformSettingsPage() {
  const { data, isLoading, isError, refetch } = usePlatformSettings();
  const save = useSavePlatformSettings();
  const [values, setValues] = useState({ commissionRatePct: '', pesapalTransactionFeeRatePct: '', deliveryFlatFee: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!data) return;
    setValues(Object.fromEntries(FIELDS.map((f) => [f, data[f] != null ? String(data[f]) : ''])));
  }, [data]);

  function set(field) {
    return (e) => {
      setValues((v) => ({ ...v, [field]: e.target.value }));
      setErrors((er) => ({ ...er, [field]: undefined }));
    };
  }

  function submit(e) {
    e.preventDefault();
    const next = {};
    const problems = {};
    const pct = (field, required) => {
      const raw = values[field];
      if (raw === '' && !required) return (next[field] = 0);
      const n = Number(raw);
      if (raw === '' || Number.isNaN(n) || n < 0 || n > 100) problems[field] = 'Enter a percentage between 0 and 100.';
      else next[field] = n;
      return undefined;
    };
    pct('commissionRatePct', true);
    pct('pesapalTransactionFeeRatePct', false);
    const fee = values.deliveryFlatFee === '' ? 0 : Number(values.deliveryFlatFee);
    if (Number.isNaN(fee) || fee < 0) problems.deliveryFlatFee = 'Enter an amount of 0 or more (0 = free delivery).';
    else next.deliveryFlatFee = fee;

    setErrors(problems);
    if (Object.keys(problems).length === 0) save.mutate(next);
  }

  return (
    <PageWrapper className="max-w-3xl">
      <PageTitle title="Platform Settings" />
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">Platform Settings</h1>

        <Card className="p-5">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner label="Loading the platform settings" />
            </div>
          ) : isError ? (
            <ErrorBanner message="Could not load the platform settings." onRetry={refetch} />
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-col gap-5">
              <div>
                <h2 className="font-heading text-brand-white text-base font-semibold">Commission rate</h2>
                <p className="text-brand-grey text-sm mt-1">The platform's percentage on every booking.</p>
              </div>
              <Input
                label="Commission rate (%)"
                name="commissionRatePct"
                type="number"
                min="0"
                max="100"
                step="0.1"
                inputMode="decimal"
                value={values.commissionRatePct}
                onChange={set('commissionRatePct')}
                error={errors.commissionRatePct}
              />

              <div className="border-t border-white/10 pt-5">
                <h2 className="font-heading text-brand-white text-base font-semibold">Payment processing fee</h2>
                <p className="text-brand-grey text-sm mt-1">The Pesapal transaction fee, as a percentage of each payment.</p>
              </div>
              <Input
                label="Pesapal transaction fee (%)"
                name="pesapalTransactionFeeRatePct"
                type="number"
                min="0"
                max="100"
                step="0.01"
                inputMode="decimal"
                value={values.pesapalTransactionFeeRatePct}
                onChange={set('pesapalTransactionFeeRatePct')}
                error={errors.pesapalTransactionFeeRatePct}
              />

              <div className="border-t border-white/10 pt-5">
                <h2 className="font-heading text-brand-white text-base font-semibold">Delivery fee</h2>
                <p className="text-brand-grey text-sm mt-1">
                  A flat amount added to a booking when the renter asks for the vehicle to be delivered to them.
                  Renters who collect the vehicle themselves pay nothing extra. Set 0 for free delivery.
                </p>
              </div>
              <Input
                label="Delivery flat fee (KES)"
                name="deliveryFlatFee"
                type="number"
                min="0"
                step="50"
                inputMode="numeric"
                value={values.deliveryFlatFee}
                onChange={set('deliveryFlatFee')}
                error={errors.deliveryFlatFee}
              />

              <Button type="submit" className="self-start" loading={save.isPending}>
                {!save.isPending && <Save size={15} aria-hidden="true" />}
                Save settings
              </Button>
            </form>
          )}
        </Card>

        <PlatformPolicyCard />
      </div>
    </PageWrapper>
  );
}

/**
 * The platform's standard booking policy (`GET`/`PUT /booking-policies/platform`) — what bookings follow when
 * their owner hasn't set one of their own (Owner Panel → Booking Policy).
 */
function PlatformPolicyCard() {
  const policy = usePlatformPolicy();
  const save = useSavePlatformPolicy();
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-brand-white text-base font-semibold">Standard booking policy</h2>
        <p className="text-brand-grey text-sm mt-1">
          Cancellation and date-moving rules for owners who haven't set their own. It applies to bookings made from
          now on.
        </p>
      </div>
      {policy.isLoading ? (
        <div className="flex justify-center py-6"><Spinner label="Loading the booking policy" /></div>
      ) : policy.isError && policy.error?.response?.status !== 404 ? (
        <ErrorBanner message="Could not load the booking policy." onRetry={policy.refetch} />
      ) : (
        <BookingPolicyForm policy={policy.data} onSave={(p) => save.mutate(p)} saving={save.isPending} />
      )}
    </Card>
  );
}
