import React, { useEffect, useRef, useState } from 'react';
import {
  addDays,
  addHours,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfHour,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isBefore,
  isWithinInterval,
  startOfDay,
  setHours,
  setMinutes,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import Button from '../ui/Button';

export const DEFAULT_START_TIME = '09:00';
export const DEFAULT_END_TIME = '17:00';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const PRESETS = [
  { label: 'Today', getRange: (today) => [today, today] },
  { label: 'Tomorrow', getRange: (today) => [addDays(today, 1), addDays(today, 1)] },
  { label: 'Next 3 Days', getRange: (today) => [today, addDays(today, 2)] },
  { label: 'This Week', getRange: (today) => [today, addDays(today, 6)] },
];

/** Combines a date-only Date with an "HH:mm" string into one Date. */
export function combineDateAndTime(date, time) {
  if (!date) return null;
  const [hours, minutes] = (time || '00:00').split(':').map(Number);
  return setMinutes(setHours(date, hours), minutes);
}

/**
 * The plain `DEFAULT_START_TIME` (09:00) is already in the past on any "today" pick made after
 * 9am — which the backend then rejects outright (`POST /bookings/create` requires `startTime` to
 * be a future date), well after the renter has already stepped through checkout. Picking "Today" or
 * "Next 3 Days" in the afternoon reproduces it every time. For today, this bumps the default pickup
 * time forward to the next full hour instead; any other day keeps the plain default.
 */
function defaultStartTimeFor(date) {
  if (!isSameDay(date, new Date())) return DEFAULT_START_TIME;
  const now = new Date();
  if (!isBefore(combineDateAndTime(date, DEFAULT_START_TIME), now)) return DEFAULT_START_TIME;
  return format(addHours(startOfHour(now), 1), 'HH:mm');
}

/** Keeps a same-day return time after its (possibly bumped, see `defaultStartTimeFor`) pickup time. */
function defaultEndTimeFor(startDate, endDate, startTime) {
  if (!isSameDay(startDate, endDate)) return DEFAULT_END_TIME;
  const pickup = combineDateAndTime(startDate, startTime);
  const plainReturn = combineDateAndTime(endDate, DEFAULT_END_TIME);
  if (isBefore(pickup, plainReturn)) return DEFAULT_END_TIME;
  return format(addHours(pickup, 1), 'HH:mm');
}

function buildCalendarDays(viewMonth) {
  const start = startOfWeek(startOfMonth(viewMonth));
  const end = endOfWeek(endOfMonth(viewMonth));
  return eachDayOfInterval({ start, end });
}

/**
 * Custom trip date + time range picker — a single anchored popover replaces
 * two native `datetime-local` inputs with a themed calendar, range
 * selection, quick presets, and dedicated time fields. Kept deliberately
 * compact (tight padding, small day cells) so the whole thing — including
 * the time row — fits on screen without scrolling in the common case;
 * `max-h` + internal scroll is only a fallback for very short viewports.
 *
 * @param {{startDate: Date|null, endDate: Date|null, startTime: string, endTime: string}} value
 * @param {function} onChange
 * @param {Array<{start: Date, end: Date}>} [disabledRanges] — calendar days that can't be picked at all (as
 *   either endpoint, or anywhere inside a range spanning across one), shown struck through and refused on
 *   click rather than merely rejected after the fact. The caller decides what these mean (someone's existing
 *   booking, a blackout date, …) — this widget only enforces them.
 */
export default function DateRangePicker({ value, onChange, className = '', disabledRanges = [] }) {
  const { startDate, endDate, startTime, endTime } = value;
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(startDate || new Date());
  const [hoverDate, setHoverDate] = useState(null);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleOutsideClick(e) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const today = startOfDay(new Date());

  /** Whether `day` falls inside any of `disabledRanges`, at day granularity. */
  function isDayDisabled(day) {
    return disabledRanges.some((r) => !isBefore(startOfDay(r.end), day) && !isBefore(day, startOfDay(r.start)));
  }

  function handleDayClick(day) {
    if (isBefore(day, today) || isDayDisabled(day)) return;
    if (!startDate || endDate) {
      // Every caller of this component seeds `value.startTime` with `DEFAULT_START_TIME` even before any
      // date is chosen (it's their placeholder for the closed trigger's label), so a truthy `startTime`
      // here does NOT mean the person picked it — only `startDate` being already set does. Trusting it
      // regardless would silently undo `defaultStartTimeFor`'s "today already passed 09:00" bump below.
      const resolvedStartTime = (startDate ? startTime : null) || defaultStartTimeFor(day);
      const resolvedEndTime = (startDate ? endTime : null) || DEFAULT_END_TIME;
      onChange({ startDate: day, endDate: null, startTime: resolvedStartTime, endTime: resolvedEndTime });
    } else if (isBefore(day, startDate)) {
      onChange({ ...value, startDate: day, endDate: null });
    } else {
      // Refuse a range that would span across a disabled day in between the two endpoints, not just one
      // landing directly on it — picking either endpoint right up against the gap is still fine.
      if (eachDayOfInterval({ start: startDate, end: day }).some(isDayDisabled)) return;
      const resolvedStartTime = startTime || defaultStartTimeFor(startDate);
      const resolvedEndTime = isSameDay(day, startDate) ? defaultEndTimeFor(startDate, day, resolvedStartTime) : endTime;
      onChange({ ...value, endDate: day, startTime: resolvedStartTime, endTime: resolvedEndTime });
    }
  }

  function applyPreset(preset) {
    const [start, end] = preset.getRange(today);
    // Same reasoning as handleDayClick above: ignore the caller's placeholder `startTime` unless a date
    // was already picked.
    const resolvedStartTime = (startDate ? startTime : null) || defaultStartTimeFor(start);
    onChange({
      startDate: start,
      endDate: end,
      startTime: resolvedStartTime,
      endTime: defaultEndTimeFor(start, end, resolvedStartTime),
    });
    setViewMonth(start);
  }

  function handleClear() {
    onChange({ startDate: null, endDate: null, startTime: DEFAULT_START_TIME, endTime: DEFAULT_END_TIME });
  }

  const days = buildCalendarDays(viewMonth);

  const label = startDate
    ? endDate
      ? `${format(startDate, 'd MMM')} – ${format(endDate, 'd MMM')} · ${startTime || DEFAULT_START_TIME}–${endTime || DEFAULT_END_TIME}`
      : `${format(startDate, 'd MMM')} — select return date`
    : 'Add trip dates';

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 text-left"
      >
        <Calendar size={16} className="text-accent shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink">Trip Dates</span>
          <span className={`text-sm truncate ${startDate ? 'text-ink' : 'text-muted'}`}>{label}</span>
        </div>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Choose trip dates and times"
          className="absolute z-50 top-full mt-2.5 left-1/2 -translate-x-1/2 lg:left-auto lg:right-0 lg:translate-x-0 w-[300px] max-h-[75vh] overflow-y-auto bg-surface border border-ink/10 rounded-2xl shadow-card p-3.5 origin-top animate-panel-in"
        >
          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className="px-2.5 py-1 rounded-full bg-surface border border-line text-ink text-[11px] font-medium hover:border-brand-gold hover:bg-brand-gold/10 transition-colors focus-ring"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Which endpoint the next click picks — the calendar itself already guides this (handleDayClick:
              first click sets the start, the next sets the end, a third starts over), but nothing said so
              out loud until now; a renter shouldn't have to infer it from watching a highlight move. */}
          <p className="text-[11px] font-medium text-accent mb-2" aria-live="polite">
            {!startDate ? 'Select your start date' : !endDate ? 'Now select your return date' : 'Tip: pick a new day to start over'}
          </p>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-1.5">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              aria-label="Previous month"
              className="p-1 rounded-full text-muted hover:text-accent hover:bg-ink/5 transition-colors focus-ring"
            >
              <ChevronLeft size={15} aria-hidden="true" />
            </button>
            <span className="font-heading text-ink text-sm font-semibold">{format(viewMonth, 'MMMM yyyy')}</span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
              className="p-1 rounded-full text-muted hover:text-accent hover:bg-ink/5 transition-colors focus-ring"
            >
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </div>

          {disabledRanges.length > 0 && (
            <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-red-600">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500/30 border border-red-500/50 shrink-0" aria-hidden="true" />
              Not available
            </div>
          )}

          {/* Weekday row */}
          <div className="grid grid-cols-7">
            {WEEKDAY_LABELS.map((d, i) => (
              <span key={i} className="text-center text-[9px] font-semibold text-muted uppercase py-0.5">
                {d}
              </span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5" onMouseLeave={() => setHoverDate(null)}>
            {days.map((day) => {
              const inMonth = isSameMonth(day, viewMonth);
              const past = isBefore(day, today);
              const booked = !past && isDayDisabled(day);
              const disabled = past || booked;
              const isStart = startDate && isSameDay(day, startDate);
              const isEnd = endDate && isSameDay(day, endDate);
              const isEndpoint = isStart || isEnd;
              const previewEnd = startDate && !endDate && hoverDate && !isBefore(hoverDate, startDate) ? hoverDate : endDate;
              const inRange =
                startDate && previewEnd && !isEndpoint && isWithinInterval(day, { start: startDate, end: previewEnd });

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleDayClick(day)}
                  onMouseEnter={() => setHoverDate(day)}
                  aria-current={isSameDay(day, today) ? 'date' : undefined}
                  aria-pressed={isEndpoint}
                  title={booked ? 'Not available — already booked' : undefined}
                  // Bookable days are dark and medium-weight; past days a plain readable grey (no strike-through);
                  // the picked dates Ramellian navy with gold numbers, the days between them a soft gold band,
                  // and today a small gold dot. Gold marks what matters, never what can't be chosen.
                  className={[
                    'relative h-7 text-[11px] rounded-full transition-colors focus-ring',
                    isEndpoint ? 'bg-brand-navy text-brand-gold font-bold' : !inMonth ? 'text-ink/30' : booked ? 'bg-red-500/15 text-red-600 line-through font-semibold border border-red-500/30 cursor-not-allowed' : disabled ? 'text-muted cursor-not-allowed' : 'text-ink font-medium hover:bg-brand-gold/20',
                    inRange && !isEndpoint ? 'bg-brand-gold/20' : '',
                  ].join(' ')}
                >
                  {format(day, 'd')}
                  {isSameDay(day, today) && !isEndpoint && (
                    <span aria-hidden="true" className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-brand-gold" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-ink/10">
            <label className="flex flex-col gap-0.5">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted inline-flex items-center gap-1">
                <Clock size={10} aria-hidden="true" /> Pick-up Time
              </span>
              <input
                type="time"
                value={startTime || DEFAULT_START_TIME}
                onChange={(e) => onChange({ ...value, startTime: e.target.value })}
                className="bg-surface border border-line rounded-lg px-2 py-1 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted inline-flex items-center gap-1">
                <Clock size={10} aria-hidden="true" /> Return Time
              </span>
              <input
                type="time"
                value={endTime || DEFAULT_END_TIME}
                onChange={(e) => onChange({ ...value, endTime: e.target.value })}
                className="bg-surface border border-line rounded-lg px-2 py-1 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between mt-3">
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-muted hover:text-ink transition-colors focus-ring rounded-md px-1"
            >
              Clear
            </button>
            <Button size="sm" onClick={() => setOpen(false)} disabled={!startDate}>
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
