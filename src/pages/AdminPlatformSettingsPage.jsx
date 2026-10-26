import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AtSign, BellRing, Bot, CalendarClock, Percent, Save } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import Checkbox from '../components/ui/Checkbox';
import ErrorBanner from '../components/ui/ErrorBanner';
import SegmentedControl from '../components/ui/SegmentedControl';
import BookingPolicyForm from '../components/booking/BookingPolicyForm';
import { usePlatformPolicy, useSavePlatformPolicy } from '../hooks/useBookingPolicies';
import { usePlatformSettings, useSavePlatformSettings, useToggleBotAssistant } from '../hooks/usePlatformSettings';

/** The page's tabs — so each part is one short screen instead of one long scroll (product owner, 2026-10-26). */
const TABS = [
  { value: 'fees', label: 'Fees & commission', icon: Percent },
  { value: 'policy', label: 'Booking policy', icon: CalendarClock },
  { value: 'reminders', label: 'Pickup reminders', icon: BellRing },
  { value: 'contact', label: 'Contact & social', icon: AtSign },
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
    } else {
      // Both cleared: one rate for every booking. Sent as empty — a save keeps whatever it leaves out.
      next.multiDayCommissionRatePct = null;
      next.multiDayThresholdDays = null;
    }
    pct('pesapalTransactionFeeRatePct', false);
    const amount = (field, message) => {
      const n = values[field] === '' ? 0 : Number(values[field]);
      if (Number.isNaN(n) || n < 0) problems[field] = message;
      else next[field] = n;
    };
    amount('deliveryFlatFee', 'Enter an amount of 0 or more (0 = free delivery).');
    amount('driverFlatCharge', 'Enter an amount of 0 or more (0 = no driver charge).');

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

          {(tab === 'reminders' || tab === 'contact') &&
            (data ? (
              tab === 'reminders' ? <RemindersCard settings={data} /> : <ContactCard settings={data} />
            ) : isError ? (
              <ErrorBanner message="Could not load the platform settings." onRetry={refetch} />
            ) : (
              <div className="flex justify-center py-6"><Spinner label="Loading the platform settings" /></div>
            ))}

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
 * The reminders the backend sends before a pickup (live spec 2026-10-26): on or off overall, to the renter and to the
 * owner, and how long before the pickup. (The portal's own pickup banner for renters is separate and always shown.)
 */
function RemindersCard({ settings }) {
  const save = useSavePlatformSettings();
  const [on, setOn] = useState(settings.pickupReminderEnabled !== false);
  const [renter, setRenter] = useState(settings.pickupReminderRenterEnabled !== false);
  const [owner, setOwner] = useState(settings.pickupReminderOwnerEnabled !== false);
  const [lead, setLead] = useState(settings.pickupReminderLeadMinutes != null ? String(settings.pickupReminderLeadMinutes) : '60');
  const [error, setError] = useState(null);

  function submit(e) {
    e.preventDefault();
    const minutes = Number(lead);
    if (!Number.isInteger(minutes) || minutes < 1) {
      setError('Enter a whole number of minutes, 1 or more.');
      return;
    }
    setError(null);
    save.mutate({ pickupReminderEnabled: on, pickupReminderRenterEnabled: renter, pickupReminderOwnerEnabled: owner, pickupReminderLeadMinutes: minutes });
  }

  const asHours = Number(lead) >= 60 && Number.isInteger(Number(lead) / 60) ? ` (${Number(lead) / 60} h)` : '';
  return (
    <Card className="p-5">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div>
          <h2 className="font-heading text-ink text-base font-semibold">Pickup reminders</h2>
          <p className="text-muted text-sm mt-1">
            A reminder sent before each pickup, so the renter goes to collect the car and the owner is ready to hand it over.
          </p>
        </div>
        <Checkbox label="Send pickup reminders" checked={on} onChange={(e) => setOn(e.target.checked)} />
        <div className={`flex flex-col gap-3 pl-6 ${on ? '' : 'opacity-50'}`}>
          <Checkbox label="To the renter" checked={renter} disabled={!on} onChange={(e) => setRenter(e.target.checked)} />
          <Checkbox label="To the owner" checked={owner} disabled={!on} onChange={(e) => setOwner(e.target.checked)} />
          <div className="sm:max-w-xs">
            <Input
              label="How long before pickup (minutes)"
              name="pickupReminderLeadMinutes"
              type="number"
              min="1"
              step="15"
              inputMode="numeric"
              hint={`e.g. 60 = an hour before${asHours}`}
              value={lead}
              disabled={!on}
              onChange={(e) => {
                setLead(e.target.value);
                setError(null);
              }}
              error={error}
            />
          </div>
        </div>
        <Button type="submit" className="self-start" loading={save.isPending}>
          {!save.isPending && <Save size={15} aria-hidden="true" />}
          Save reminders
        </Button>
      </form>
    </Card>
  );
}

const CONTACT_FIELDS = [
  { key: 'supportPhone', label: 'Phone', hint: 'e.g. +254 712 345 678', type: 'tel', inputMode: 'tel' },
  { key: 'whatsapp', label: 'WhatsApp', hint: 'The number, e.g. +254 712 345 678', type: 'tel', inputMode: 'tel' },
  { key: 'supportEmail', label: 'Email', hint: 'e.g. bookings@ramellianexecutivetravels.co.ke', type: 'email', inputMode: 'email' },
  { key: 'website', label: 'Website', hint: 'e.g. https://ramellianexecutivetravels.co.ke', type: 'url', inputMode: 'url' },
  { key: 'address', label: 'Address', hint: 'e.g. Westlands, Nairobi' },
  { key: 'facebook', label: 'Facebook', hint: 'Page link or name' },
  { key: 'instagram', label: 'Instagram', hint: 'Profile link or @handle' },
  { key: 'xTwitter', label: 'X (Twitter)', hint: 'Profile link or @handle' },
  { key: 'tiktok', label: 'TikTok', hint: 'Profile link or @handle' },
];

/**
 * The business's public contact details and social profiles (live spec 2026-10-26) — shown on the Contact page and in
 * the footer, and given to search engines. Anything left empty is simply not shown anywhere.
 */
function ContactCard({ settings }) {
  const save = useSavePlatformSettings();
  const [values, setValues] = useState(Object.fromEntries(CONTACT_FIELDS.map((f) => [f.key, settings[f.key] || ''])));
  const [errors, setErrors] = useState({});

  function submit(e) {
    e.preventDefault();
    const next = Object.fromEntries(CONTACT_FIELDS.map((f) => [f.key, values[f.key].trim() || null]));
    const problems = {};
    if (next.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.supportEmail)) problems.supportEmail = 'Enter a valid email address.';
    if (next.website && !/^https?:\/\//i.test(next.website)) next.website = `https://${next.website}`;
    for (const k of ['supportPhone', 'whatsapp']) {
      if (next[k] && next[k].replace(/\D/g, '').length < 9) problems[k] = 'Enter the full number, with its country code.';
    }
    setErrors(problems);
    if (Object.keys(problems).length === 0) save.mutate(next);
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div>
          <h2 className="font-heading text-ink text-base font-semibold">Contact &amp; social</h2>
          <p className="text-muted text-sm mt-1">
            Shown on the Contact page and in the footer, and given to search engines. Leave a field empty to hide it.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CONTACT_FIELDS.map((f) => (
            <Input
              key={f.key}
              label={f.label}
              name={f.key}
              type={f.type || 'text'}
              inputMode={f.inputMode}
              hint={f.hint}
              value={values[f.key]}
              onChange={(e) => {
                setValues((v) => ({ ...v, [f.key]: e.target.value }));
                setErrors((er) => ({ ...er, [f.key]: undefined }));
              }}
              error={errors[f.key]}
            />
          ))}
        </div>
        <Button type="submit" className="self-start" loading={save.isPending}>
          {!save.isPending && <Save size={15} aria-hidden="true" />}
          Save contact details
        </Button>
      </form>
    </Card>
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
