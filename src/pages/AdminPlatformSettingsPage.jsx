import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot, CalendarClock, Percent, Save } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import ErrorBanner from '../components/ui/ErrorBanner';
import SegmentedControl from '../components/ui/SegmentedControl';
import BookingPolicyForm from '../components/booking/BookingPolicyForm';
import { usePlatformPolicy, useSavePlatformPolicy } from '../hooks/useBookingPolicies';
import { usePlatformSettings, useSavePlatformSettings, useToggleBotAssistant } from '../hooks/usePlatformSettings';

/** The page's tabs — so each part is one short screen instead of one long scroll (product owner, 2026-10-26). */
const TABS = [
  { value: 'fees', label: 'Fees & commission', icon: Percent },
  { value: 'policy', label: 'Booking policy', icon: CalendarClock },
  { value: 'assistant', label: 'Assistant', icon: Bot },
];

const FIELDS = ['commissionRatePct', 'multiDayCommissionRatePct', 'multiDayThresholdDays', 'pesapalTransactionFeeRatePct', 'deliveryFlatFee', 'driverFlatCharge'];

/**
 * Platform-wide settings — `GET`/`PUT /platform-settings` (docs/backend-requests.md item 26): the commission
 * rate, the Pesapal transaction fee rate, the flat fee for delivering a vehicle to a renter and the flat charge
 * for a driver on a chauffeured booking (live spec 2026-10-25), and — since 2026-10-26 — a separate commission
 * rate for longer bookings (`multiDayCommissionRatePct`, 0–100) from `multiDayThresholdDays` days on (inclusive:
 * checked live with 2% / 10% from 2 days — a 1-day quote took 2%, 2- and 3-day quotes 10%). Both are optional in
 * the spec; they're set together or left empty together. `POST /bookings/quote` applies them all, so a
 * change here reprices every future quote and booking. They're saved together, since the `PUT` replaces the
 * settings as a whole — which is why the save also sends the assistant switch back unchanged. The assistant
 * itself is switched on its own card (`PUT /platform-settings/bot`).
 */
export default function AdminPlatformSettingsPage() {
  // The open tab lives in the address (?tab=policy), so it survives a reload and can be linked to.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === searchParams.get('tab')) ? searchParams.get('tab') : 'fees';
  const setTab = (value) => setSearchParams(value === 'fees' ? {} : { tab: value }, { replace: true });
  const { data, isLoading, isError, refetch } = usePlatformSettings();
  const save = useSavePlatformSettings();
  const [values, setValues] = useState(Object.fromEntries(FIELDS.map((f) => [f, ''])));
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
    // The longer-booking rate and the number of days it starts at only mean something together.
    const multiRate = String(values.multiDayCommissionRatePct).trim();
    const multiDays = String(values.multiDayThresholdDays).trim();
    if (multiRate !== '' || multiDays !== '') {
      if (multiRate === '') problems.multiDayCommissionRatePct = 'Enter the rate for longer bookings, or clear the number of days.';
      else pct('multiDayCommissionRatePct', true);
      const d = Number(multiDays);
      if (multiDays === '') problems.multiDayThresholdDays = 'Enter from how many days it applies, or clear the rate.';
      else if (!Number.isInteger(d) || d < 1) problems.multiDayThresholdDays = 'Enter a whole number of days, 1 or more.';
      else next.multiDayThresholdDays = d;
    }
    pct('pesapalTransactionFeeRatePct', false);
    const amount = (field, message) => {
      const n = values[field] === '' ? 0 : Number(values[field]);
      if (Number.isNaN(n) || n < 0) problems[field] = message;
      else next[field] = n;
    };
    amount('deliveryFlatFee', 'Enter an amount of 0 or more (0 = free delivery).');
    amount('driverFlatCharge', 'Enter an amount of 0 or more (0 = no driver charge).');
    if (typeof data?.botAssistantEnabled === 'boolean') next.botAssistantEnabled = data.botAssistantEnabled;

    setErrors(problems);
    if (Object.keys(problems).length === 0) save.mutate(next);
  }

  // One field of the fees form: a short heading line is the field's own label, the explanation its hint.
  const field = (name, label, hint, extra) => (
    <Input
      label={label}
      name={name}
      type="number"
      min="0"
      hint={hint}
      value={values[name]}
      onChange={set(name)}
      error={errors[name]}
      {...extra}
    />
  );
  const percent = { max: '100', step: '0.1', inputMode: 'decimal' };
  const money = { step: '50', inputMode: 'numeric' };

  return (
    <PageWrapper className="max-w-3xl">
      <PageTitle title="Platform Settings" />
      <div className="flex flex-col gap-5">
        <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Platform Settings</h1>

        <SegmentedControl kind="tab" label="Settings" options={TABS} value={tab} onChange={setTab} />

        <div role="tabpanel" aria-label={TABS.find((t) => t.value === tab).label}>
          {tab === 'fees' && (
            <Card className="p-5">
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner label="Loading the platform settings" />
                </div>
              ) : isError ? (
                <ErrorBanner message="Could not load the platform settings." onRetry={refetch} />
              ) : (
                <form onSubmit={submit} noValidate className="flex flex-col gap-6">
                  <fieldset className="flex flex-col gap-4">
                    <legend className="font-heading text-ink text-base font-semibold mb-1">Commission</legend>
                    <p className="text-muted text-sm -mt-2">
                      The platform's share of each booking, taken from the owner's share. Longer bookings can have their
                      own rate — leave those two empty to use one rate for every booking.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {field('commissionRatePct', 'Commission (%)', 'Every booking', percent)}
                      {field('multiDayCommissionRatePct', 'Longer bookings (%)', 'e.g. 10', percent)}
                      {field('multiDayThresholdDays', 'From (days)', 'e.g. 2 = 2 days or more', { min: '1', step: '1', inputMode: 'numeric' })}
                    </div>
                  </fieldset>

                  <fieldset className="flex flex-col gap-4 border-t border-ink/10 pt-5">
                    <legend className="sr-only">Fees and charges</legend>
                    <p className="font-heading text-ink text-base font-semibold" aria-hidden="true">Fees and charges</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {field('pesapalTransactionFeeRatePct', 'Pesapal transaction fee (%)', 'Of each payment', { ...percent, step: '0.01' })}
                      {field('deliveryFlatFee', 'Delivery flat fee (KES)', 'When the car is delivered; 0 = free', money)}
                      {field('driverFlatCharge', 'Driver flat charge (KES)', 'Chauffeured bookings; 0 = none', money)}
                    </div>
                  </fieldset>

                  <Button type="submit" className="self-start" loading={save.isPending}>
                    {!save.isPending && <Save size={15} aria-hidden="true" />}
                    Save settings
                  </Button>
                </form>
              )}
            </Card>
          )}

          {tab === 'policy' && <PlatformPolicyCard />}

          {tab === 'assistant' &&
            (data ? (
              <AssistantCard enabled={data.botAssistantEnabled !== false} />
            ) : isError ? (
              <ErrorBanner message="Could not load the platform settings." onRetry={refetch} />
            ) : (
              <div className="flex justify-center py-6"><Spinner label="Loading the platform settings" /></div>
            ))}
        </div>
      </div>
    </PageWrapper>
  );
}

/**
 * Switches the in-app assistant (the chat button, the Assistant page and its menu items) on or off for every
 * signed-in person — `PUT /platform-settings/bot`. Missing from the settings counts as on.
 */
function AssistantCard({ enabled }) {
  const toggle = useToggleBotAssistant();
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-ink text-base font-semibold inline-flex items-center gap-2">
            <Bot size={16} className="text-accent" aria-hidden="true" />
            Assistant
          </h2>
          <p className="text-muted text-sm mt-1">
            The in-app chat assistant. When it's off, signed-in people no longer see the chat button or the Assistant
            page.
          </p>
        </div>
        <Badge label={enabled ? 'On' : 'Off'} variant={enabled ? 'success' : 'neutral'} />
      </div>
      <Button
        variant={enabled ? 'outline' : 'default'}
        className="self-start"
        loading={toggle.isPending}
        onClick={() => toggle.mutate(!enabled)}
      >
        {enabled ? 'Turn the assistant off' : 'Turn the assistant on'}
      </Button>
    </Card>
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
        <h2 className="font-heading text-ink text-base font-semibold">Standard booking policy</h2>
        <p className="text-muted text-sm mt-1">
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
