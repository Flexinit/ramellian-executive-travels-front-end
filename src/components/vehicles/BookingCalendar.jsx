import React, { useState } from 'react';
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, isSameMonth, isWithinInterval, startOfDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CarFront } from 'lucide-react';
import BookingStatusBadge from '../booking/BookingStatusBadge';
import { bookingStatusVariant, formatDateRange } from '../../lib/utils';
import { vehicleColorToCss } from '../../lib/vehicleColor';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** A ring around the car icon for status (gold/green/red/…), so the icon itself is free to show the
 * vehicle's own color instead. */
const STATUS_RING = {
  success: 'ring-green-400',
  warning: 'ring-yellow-400',
  danger: 'ring-red-400',
  info: 'ring-blue-400',
  gold: 'ring-accent',
  neutral: 'ring-muted',
};

/** One day's car icon — tinted to the vehicle's own color (see `lib/vehicleColor.js`), ringed in its
 * status color, so both are visible on the same small marker at once. */
function BookingMarker({ status, vehicleColor, size = 14 }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full p-px ring-1 ${STATUS_RING[bookingStatusVariant(status)]}`}>
      <CarFront size={size} style={{ color: vehicleColorToCss(vehicleColor) }} aria-hidden="true" />
    </span>
  );
}

function buildCalendarDays(viewMonth) {
  const start = startOfWeek(startOfMonth(viewMonth));
  const end = endOfWeek(endOfMonth(viewMonth));
  return eachDayOfInterval({ start, end });
}

/** Every period (see `lib/vehicleBookings.js`'s `bookedPeriods`) that covers `day`, soonest-booked first. */
function periodsOnDay(periods, day) {
  return periods.filter((p) => p.start && p.end && isWithinInterval(day, { start: startOfDay(p.start), end: p.end }));
}

/**
 * A read-only month calendar of a vehicle's (or a fleet's) bookings — up to 3 small car icons per day, each
 * tinted to its vehicle's own color with a ring in its status color, click a day to see exactly which
 * booking(s) cover it below the grid. Pure display: it never changes a date, so it has none of
 * `DateRangePicker`'s selection/range logic, just the same month-grid shape.
 *
 * @param {Array<{id: string, start: Date, end: Date, status: string, vehicleModel?: string, vehicleColor?: string}>} periods —
 *   `vehicleModel`/`vehicleColor` are optional, read per period so the fleet-wide calendar can show each
 *   vehicle's own name and color; a single vehicle's own calendar can instead just pass `vehicleColor` below
 *   once, rather than repeating it on every one of its own periods.
 * @param {string} [vehicleColor] — fallback used for any period that doesn't carry its own `vehicleColor`
 * @param {Date} [initialMonth]
 */
export default function BookingCalendar({ periods, vehicleColor, initialMonth = new Date() }) {
  const [viewMonth, setViewMonth] = useState(startOfMonth(initialMonth));
  const [selectedDay, setSelectedDay] = useState(null);

  const today = startOfDay(new Date());
  const days = buildCalendarDays(viewMonth);
  const statusesPresent = [...new Set(periods.map((p) => p.status).filter(Boolean))];
  const selectedPeriods = selectedDay ? periodsOnDay(periods, selectedDay) : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          aria-label="Previous month"
          className="p-1.5 rounded-full text-muted hover:text-accent hover:bg-ink/5 transition-colors focus-ring"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <span className="font-heading text-ink text-sm font-semibold">{format(viewMonth, 'MMMM yyyy')}</span>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
          className="p-1.5 rounded-full text-muted hover:text-accent hover:bg-ink/5 transition-colors focus-ring"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAY_LABELS.map((d, i) => (
          <span key={i} className="text-center text-[10px] font-semibold text-muted/70 uppercase py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewMonth);
          const dayPeriods = periodsOnDay(periods, day);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDay && isSameDay(day, selectedDay);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setSelectedDay(dayPeriods.length > 0 ? day : null)}
              disabled={dayPeriods.length === 0}
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={isSelected}
              className={[
                'relative h-11 flex flex-col items-center justify-center gap-1 rounded-lg transition-colors focus-ring',
                !inMonth ? 'text-ink/25' : 'text-ink',
                dayPeriods.length > 0 ? 'cursor-pointer hover:bg-ink/10' : 'cursor-default',
                isSelected ? 'bg-accent/15 ring-1 ring-accent/50' : '',
                isToday && !isSelected ? 'bg-ink/5' : '',
              ].join(' ')}
            >
              <span className="text-[11px]">{format(day, 'd')}</span>
              {dayPeriods.length > 0 && (
                <span className="flex gap-0.5">
                  {dayPeriods.slice(0, 3).map((p) => (
                    <BookingMarker key={p.id} status={p.status} vehicleColor={p.vehicleColor || vehicleColor} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {statusesPresent.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Legend">
          {statusesPresent.map((status) => (
            <li key={status} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
              <BookingMarker status={status} size={12} />
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </li>
          ))}
        </ul>
      )}

      {selectedDay && (
        <div className="flex flex-col gap-2 pt-3 border-t border-ink/10">
          <span className="text-xs font-semibold text-ink">{format(selectedDay, 'd MMMM yyyy')}</span>
          <ul className="flex flex-col gap-2.5">
            {selectedPeriods.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0">
                  {p.vehicleModel && <span className="text-ink truncate block">{p.vehicleModel}</span>}
                  <span className="text-muted text-xs block">{formatDateRange(p.start, p.end)}</span>
                </span>
                <BookingStatusBadge status={p.status} className="shrink-0" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
