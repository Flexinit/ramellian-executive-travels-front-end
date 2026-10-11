// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OwnerVehicleCard from './OwnerVehicleCard';

const VEHICLE = { id: 'v1', model: 'Toyota Prado', pricePerDay: 15000, capacity: 5, available: true, selfDrive: true, chauffeured: false };
const period = (id, start, end) => ({ id, start: new Date(start), end: new Date(end) });

function renderCard(props) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <OwnerVehicleCard vehicle={VEHICLE} {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('OwnerVehicleCard availability', () => {
  it('shows an available vehicle as Available', () => {
    renderCard();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.queryByText(/renters can't see this vehicle/i)).not.toBeInTheDocument();
  });

  it('shows a vehicle that is not available yet, and says renters cannot see it', () => {
    renderCard({ vehicle: { ...VEHICLE, available: false } });
    expect(screen.getByText('Not listed yet')).toBeInTheDocument();
    expect(screen.getByText(/renters can't see this vehicle/i)).toBeInTheDocument();
  });

  it('says "Booked now" while a booking covers the current time, instead of Available', () => {
    const now = Date.now();
    renderCard({ bookings: [period('b1', now - 86_400_000, now + 86_400_000)] });
    expect(screen.getByText('Booked now')).toBeInTheDocument();
    expect(screen.queryByText('Available')).not.toBeInTheDocument();
  });
});

describe('OwnerVehicleCard availability switch', () => {
  it('has no switch unless the page gives it a handler', () => {
    renderCard();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('shows the switch on for an available vehicle and off for an unavailable one', () => {
    const view = renderCard({ onToggleAvailable: () => {} });
    expect(screen.getByRole('switch', { name: /available for booking/i })).toBeChecked();
    view.unmount();

    renderCard({ vehicle: { ...VEHICLE, available: false }, onToggleAvailable: () => {} });
    expect(screen.getByRole('switch', { name: /available for booking/i })).not.toBeChecked();
  });

  it('flips the vehicle in one click, passing the vehicle and the new value', async () => {
    const calls = [];
    renderCard({ onToggleAvailable: (v, available) => calls.push([v.id, available]) });

    await userEvent.setup().click(screen.getByRole('switch'));
    expect(calls).toEqual([['v1', false]]);
  });

  it('offers to make an unavailable vehicle available again', async () => {
    const calls = [];
    renderCard({ vehicle: { ...VEHICLE, available: false }, onToggleAvailable: (v, available) => calls.push(available) });

    await userEvent.setup().click(screen.getByRole('switch'));
    expect(calls).toEqual([true]);
  });

  it('is disabled while an update is in flight', () => {
    renderCard({ onToggleAvailable: () => {}, togglePending: true });
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});

describe('OwnerVehicleCard booked dates', () => {
  it('says so when there are no bookings, and offers no calendar', () => {
    renderCard();
    expect(screen.getByText(/no bookings yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view calendar/i })).not.toBeInTheDocument();
  });

  it('counts the upcoming bookings and offers a calendar', () => {
    renderCard({ bookings: [period('b1', '2030-10-05T06:00:00Z', '2030-10-08T06:00:00Z')] });
    expect(screen.getByText('1 upcoming booking')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view calendar/i })).toBeInTheDocument();
  });

  it('pluralises the count for more than one booking', () => {
    const many = [1, 2].map((n) => period(`b${n}`, `2030-10-0${n}T06:00:00Z`, `2030-10-0${n}T18:00:00Z`));
    renderCard({ bookings: many });
    expect(screen.getByText('2 upcoming bookings')).toBeInTheDocument();
  });

  it('opens the calendar modal with the vehicle name in its title', async () => {
    const user = userEvent.setup();
    renderCard({ bookings: [period('b1', '2030-10-05T06:00:00Z', '2030-10-08T06:00:00Z')] });

    await user.click(screen.getByRole('button', { name: /view calendar/i }));
    expect(screen.getByRole('heading', { name: /toyota prado.*booking calendar/i })).toBeInTheDocument();
  });
});

describe('OwnerVehicleCard details from the backend', () => {
  it('shows air conditioning, insurance and the window the vehicle can be booked in', () => {
    renderCard({
      vehicle: { ...VEHICLE, hasWorkingAC: true, comprehensiveInsurance: true, availableFrom: '2030-10-01T06:00:00Z', availableTo: '2030-12-01T06:00:00Z' },
    });
    expect(screen.getByText('A/C')).toBeInTheDocument();
    expect(screen.getByText('Insured')).toBeInTheDocument();
    expect(screen.getByText(/bookable from 01 oct 2030/i)).toBeInTheDocument();
  });

  it('shows that an insurance sticker photo is on file', () => {
    renderCard({ vehicle: { ...VEHICLE, insuranceVerificationStickerPhoto: 'https://example.com/sticker.png' } });
    expect(screen.getByText(/insurance sticker on file/i)).toBeInTheDocument();
  });

  it('says "Available any time" when no dates are set and the vehicle is available', () => {
    renderCard();
    expect(screen.getByText(/available any time/i)).toBeInTheDocument();
  });

  it('shows none of these when the vehicle does not have them', () => {
    renderCard();
    expect(screen.queryByText('A/C')).not.toBeInTheDocument();
    expect(screen.queryByText('Insured')).not.toBeInTheDocument();
    expect(screen.queryByText(/bookable/i)).not.toBeInTheDocument();
  });
});

describe('OwnerVehicleCard rating', () => {
  it('shows 5.0 while the vehicle has no reviews yet', () => {
    renderCard({ vehicle: { ...VEHICLE, rating: null } });
    expect(screen.getByText('5.0')).toBeInTheDocument();
  });

  it('shows the real rating once there is one', () => {
    renderCard({ vehicle: { ...VEHICLE, rating: 4.2 } });
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.queryByText('5.0')).not.toBeInTheDocument();
  });
});
