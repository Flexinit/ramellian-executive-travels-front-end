import React, { useState } from 'react';
import { SelfDriveIcon, ChauffeurIcon } from '../components/ui/TripModeIcons';
import { Car, MapPin, Star } from 'lucide-react';

import Button       from '../components/ui/Button';
import ToggleChip   from '../components/ui/ToggleChip';
import SegmentedControl from '../components/ui/SegmentedControl';
import Input        from '../components/ui/Input';
import Textarea     from '../components/ui/Textarea';
import Select       from '../components/ui/Select';
import Card         from '../components/ui/Card';
import Badge        from '../components/ui/Badge';
import Modal        from '../components/ui/Modal';
import Spinner      from '../components/ui/Spinner';
import TypingDots   from '../components/ui/TypingDots';
import Skeleton     from '../components/ui/Skeleton';
import EmptyState   from '../components/ui/EmptyState';
import ErrorBanner  from '../components/ui/ErrorBanner';
import Logo         from '../components/ui/Logo';
import Avatar       from '../components/ui/Avatar';
import Divider      from '../components/ui/Divider';
import Tooltip      from '../components/ui/Tooltip';
import StepIndicator from '../components/ui/StepIndicator';
import CountdownTimer from '../components/ui/CountdownTimer';
import PriceDisplay from '../components/ui/PriceDisplay';
import { DetailList, DetailRow } from '../components/ui/DetailList';
import FeatureTile, { FeatureGrid } from '../components/ui/FeatureTile';
import ContractDocument from '../components/contract/ContractDocument';
import { withPlatformClause } from '../lib/contractBoilerplate';
import contractTemplate from '../../docs/contract-templates/vehicle-rental-agreement.md?raw';
import { contractValues, fillContractText } from '../lib/contractFields';

// The real template, filled with sample details — what a renter sees on the contract page.
const SAMPLE_CONTRACT = fillContractText(
  withPlatformClause(contractTemplate),
  contractValues({
    booking: { id: 'bb5c5ab4-4365-4967-b5f0-8cbfa761c6fd', bookingMode: 'SELF_DRIVE', startTime: '2026-10-17T06:00:00Z', endTime: '2026-10-17T14:00:00Z', numberOfDays: 1, baseAmount: 15000, estimatedAmount: 15225, deliveryRequested: false },
    vehicle: { id: 'v1', model: 'Mercedes Benz', color: 'Black', capacity: 5, fuelType: 'PETROL', transmissionType: 'AUTOMATIC', hasWorkingAC: true, location: 'Marurui', pricePerDay: 15000, registrationNumber: 'KDA 123A', vin: 'WDB123456789' },
    renter: { firstName: 'Felix', lastName: 'Washioya', idNumber: '12345678', location: 'Nairobi' },
    policy: { freeCancellationWindowHours: 24, cancellationDeadlineHours: 2, lateCancellationRefundPct: 50, postponementAllowed: true, postponementDeadlineHours: 48, maxPostponements: 2 },
  })
);

const Section = ({ title, children }) => (
  <section className="mb-12">
    <h2 className="font-heading text-accent text-xl font-semibold mb-6 pb-2 border-b border-ink/10">
      {title}
    </h2>
    <div className="flex flex-wrap gap-4 items-start">{children}</div>
  </section>
);

const fuelOptions = [
  { value: 'petrol',   label: 'Petrol' },
  { value: 'diesel',   label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
];

const bookingSteps = [
  { label: 'Vehicle' },
  { label: 'Trip Details' },
  { label: 'Review' },
];

export default function WidgetShowcase() {
  const [modalOpen, setModalOpen]   = useState(false);
  const [chipOn, setChipOn]         = useState(true);
  const [segment, setSegment]       = useState('SELF');
  const [currentStep, setCurrentStep] = useState(1);
  const expiry = Date.now() + 14 * 60 * 1000; // 14 minutes from now

  return (
    <div className="flex-1 bg-canvas px-6 py-10 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-10 flex items-center gap-4">
        <Logo size="lg" />
        <div>
          <h1 className="font-heading text-3xl text-ink font-bold">Widget Showcase</h1>
          <p className="text-muted text-sm mt-1">Phase 1 — UI Primitive Library</p>
        </div>
      </div>

      {/* Buttons */}
      <Section title="Contract document">
        <ContractDocument
          contractText={SAMPLE_CONTRACT}
          reference="bb5c5ab4-4365-4967-b5f0-8cbfa761c6fd"
          agreementDate="2026-10-16T09:30:00Z"
          renter={{ name: 'Felix Washioya', signedAt: '2026-10-16T09:42:00Z' }}
          owner={{}}
          staged
        />
      </Section>

      <Section title="Buttons">
        <Button>Book Now</Button>
        <Button loading>Processing…</Button>
        <Button disabled>Unavailable</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large CTA</Button>
        <Button variant="danger">Cancel Booking</Button>
        <Button href="https://example.com">As a link</Button>
      </Section>

      {/* Chips and segmented controls */}
      <Section title="Toggle chips &amp; segmented control">
        <ToggleChip active={chipOn} onClick={() => setChipOn(!chipOn)}>Safari</ToggleChip>
        <ToggleChip active={false}>Wedding</ToggleChip>
        <SegmentedControl
          label="Booking mode"
          options={[{ value: 'SELF', label: 'Self-Drive', icon: SelfDriveIcon }, { value: 'CHAUFFEURED', label: 'Chauffeured', icon: ChauffeurIcon }]}
          value={segment}
          onChange={setSegment}
        />
      </Section>

      {/* Badges */}
      <Section title="Badges">
        <Badge label="Confirmed"  variant="success" />
        <Badge label="Pending"    variant="warning" />
        <Badge label="Cancelled"  variant="danger"  />
        <Badge label="Processing" variant="info"    />
        <Badge label="Unknown"    variant="neutral" />
        <Badge label="Executive"  variant="gold"    />
      </Section>

      {/* Spinners */}
      <Section title="Spinners">
        <Spinner size="sm" />
        <Spinner size="md" />
        <Spinner size="lg" />
        <span className="text-ink"><TypingDots /></span>
      </Section>

      {/* Logo & Avatar */}
      <Section title="Logo & Avatar">
        <Logo size="sm" />
        <Logo size="md" />
        <Logo size="lg" />
        <Divider />
        <Avatar name="John Kamau" size="sm" />
        <Avatar name="Alice Wanjiru" size="md" />
        <Avatar name="Robert Odhiambo" size="lg" />
        <Avatar name="Jane Doe" src="https://i.pravatar.cc/48?u=jane" size="md" />
      </Section>

      {/* FeatureTile */}
      <Section title="Feature Tiles">
        <div className="w-full max-w-lg">
          <FeatureGrid label="Car features">
            <FeatureTile icon={SelfDriveIcon} label="Driving" value="Self-Drive" />
            <FeatureTile icon={ChauffeurIcon} label="Driving" value="Chauffeured" />
            <FeatureTile icon={SelfDriveIcon} label="Capacity" value="5 seats" />
          </FeatureGrid>
        </div>
      </Section>

      {/* DetailList */}
      <Section title="Detail List">
        <div className="w-full max-w-lg">
          <DetailList>
            <DetailRow label="Dates">17 Oct 2026, 09:00 AM – 17 Oct 2026, 05:00 PM</DetailRow>
            <DetailRow label="Trip Type">General</DetailRow>
            <DetailRow label="Getting the vehicle">You collect it — no fee</DetailRow>
            <DetailRow label="Pickup Location">Eastleigh</DetailRow>
            <DetailRow label="Notes" stacked>Please call on arrival at the gate.</DetailRow>
            <DetailRow label="Total" divider valueClassName="font-semibold">KES 12,000</DetailRow>
          </DetailList>
        </div>
      </Section>

      {/* PriceDisplay */}
      <Section title="Price Display">
        <PriceDisplay amount={8000}  size="sm" />
        <PriceDisplay amount={12000} size="md" />
        <PriceDisplay amount={15000} size="lg" />
        <PriceDisplay amount={45000} period="/ trip" size="md" />
        <PriceDisplay amount={undefined} />
      </Section>

      {/* CountdownTimer */}
      <Section title="Countdown Timer">
        <div className="flex flex-col gap-2">
          <p className="text-muted text-xs">14 min (normal)</p>
          <CountdownTimer expiresAt={expiry} onExpired={() => {}} />
          <p className="text-muted text-xs mt-2">Under 2 min (urgent — renders in red)</p>
          <CountdownTimer expiresAt={Date.now() + 90 * 1000} onExpired={() => {}} />
        </div>
      </Section>

      {/* StepIndicator */}
      <Section title="Step Indicator">
        <div className="w-full max-w-md flex flex-col gap-6">
          {[0, 1, 2].map((step) => (
            <div key={step}>
              <p className="text-muted text-xs mb-2">Step {step + 1} active</p>
              <StepIndicator steps={bookingSteps} currentStep={step} />
            </div>
          ))}
        </div>
      </Section>

      {/* Form Controls */}
      <Section title="Form Controls">
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <Input label="Pickup Location" name="location" placeholder="e.g. JKIA Terminal 1" />
          <Input label="Email" name="email" type="email" error="Please enter a valid email" />
          <Input label="Phone" name="phone" hint="Include country code e.g. +254" />
          <Select label="Fuel Type" name="fuel" options={fuelOptions} />
          <Select label="Vehicle" name="vehicle" options={fuelOptions} error="Selection required" />
          <Textarea label="Special Instructions" name="notes" maxLength={200} placeholder="e.g. Please arrive 10 minutes early…" />
        </div>
      </Section>

      {/* Cards */}
      <Section title="Cards">
        <Card className="p-5 w-72">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-heading text-ink font-semibold">Toyota Prado</h3>
              <div className="flex items-center gap-1 text-muted text-xs mt-0.5">
                <MapPin size={11} />
                <span>Nairobi CBD</span>
              </div>
            </div>
            <Badge label="Executive" variant="gold" />
          </div>
          <div className="flex items-center gap-1 text-accent text-xs mb-3">
            <Star size={11} fill="currentColor" />
            <span className="font-semibold">5.0</span>
            <span className="text-muted">(24 trips)</span>
          </div>
          <div className="flex items-center gap-2 text-muted text-xs mb-4">
            <Car size={11} />
            <span>Diesel · Automatic · 5 seats</span>
          </div>
          <PriceDisplay amount={15000} size="sm" />
          <Button size="sm" className="mt-4 w-full">Book This Vehicle</Button>
        </Card>

        <Card className="p-5 w-72">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-heading text-ink font-semibold">Toyota Noah</h3>
              <div className="flex items-center gap-1 text-muted text-xs mt-0.5">
                <MapPin size={11} />
                <span>Westlands</span>
              </div>
            </div>
            <Badge label="Standard" variant="neutral" />
          </div>
          <div className="flex items-center gap-1 text-accent text-xs mb-3">
            <Star size={11} fill="currentColor" />
            <span className="font-semibold">4.8</span>
            <span className="text-muted">(41 trips)</span>
          </div>
          <div className="flex items-center gap-2 text-muted text-xs mb-4">
            <Car size={11} />
            <span>Petrol · Automatic · 7 seats</span>
          </div>
          <PriceDisplay amount={8000} size="sm" />
          <Button size="sm" className="mt-4 w-full">Book This Vehicle</Button>
        </Card>
      </Section>

      {/* Skeletons */}
      <Section title="Skeletons (loading placeholders)">
        <div className="flex flex-col gap-3 w-64">
          <Skeleton className="w-full h-40" />
          <Skeleton className="w-3/4 h-4" />
          <Skeleton className="w-1/2 h-4" />
          <Skeleton className="w-1/3 h-4" />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <Skeleton rounded className="w-10 h-10" />
          <div className="flex flex-col gap-2">
            <Skeleton className="w-32 h-3" />
            <Skeleton className="w-20 h-3" />
          </div>
        </div>
      </Section>

      {/* Tooltips & Dividers */}
      <Section title="Tooltips & Dividers">
        <Tooltip content="Flight-tracked pickup at JKIA arrivals">
          <Button size="sm">Airport Transfer</Button>
        </Tooltip>
        <Tooltip content="Requires approved driving licence" position="bottom">
          <Button size="sm">Self-Drive Info</Button>
        </Tooltip>
        <div className="w-full">
          <Divider className="my-4" />
          <Divider label="OR CONTINUE WITH" className="my-4" />
        </div>
      </Section>

      {/* Empty State */}
      <Section title="Empty State">
        <EmptyState
          title="No vehicles available"
          description="Try adjusting your filters or changing your travel dates."
          action={{ label: 'Clear filters', onClick: () => {} }}
        />
      </Section>

      {/* Error Banner */}
      <Section title="Error Banner">
        <div className="w-full max-w-lg flex flex-col gap-3">
          <ErrorBanner message="Failed to load vehicles. Please check your connection." onRetry={() => {}} />
          <ErrorBanner message="Your session has expired. Please log in again." />
        </div>
      </Section>

      {/* Modal */}
      <Section title="Modal">
        <Button onClick={() => setModalOpen(true)}>
          Open Booking Modal
        </Button>
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Confirm Your Booking"
        >
          <div className="flex flex-col gap-4">
            <p className="text-muted text-sm">
              You are about to book a <span className="text-ink font-medium">Toyota Prado</span> for
              3 days from <span className="text-ink font-medium">01 Oct 2026</span>.
            </p>
            <div className="flex items-center justify-between py-3 border-y border-ink/10">
              <span className="text-muted text-sm">Total</span>
              <PriceDisplay amount={45000} period="/ 3 days" size="sm" />
            </div>
            <div className="flex gap-3 justify-end">
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={() => setModalOpen(false)}>Confirm Booking</Button>
            </div>
          </div>
        </Modal>
      </Section>

    </div>
  );
}
