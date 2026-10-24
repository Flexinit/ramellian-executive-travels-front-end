import React, { useEffect, useRef } from 'react';
import { Check, Minus } from 'lucide-react';
import Button from '../ui/Button';
import { groupPermissions, permissionAction, permissionGroup } from '../../lib/rolesPermissions';

/** The everyday actions, listed first and in this order; anything else (Approve, Review, Upload…) follows them. */
const STANDARD = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'MANAGE'];

/** The part of a permission name after its group: `VEHICLE_APPROVE` → `APPROVE`. */
const actionKey = (name) => {
  const group = permissionGroup(name);
  return group === 'OTHER' ? name : name.slice(group.length + 1);
};

/** Standard actions in their usual order, then the rest A–Z. */
const actionRank = (name) => {
  const i = STANDARD.indexOf(actionKey(name));
  return i === -1 ? STANDARD.length : i;
};

const CHIP =
  'inline-flex select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 ' +
  'peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface';
const CHIP_OFF = 'border-ink/10 bg-black/[0.03] text-muted hover:border-ink/25 hover:bg-black/[0.06] hover:text-ink';
const CHIP_ON = 'border-accent bg-accent text-on-accent';
const CHIP_ON_DANGER = 'border-red-400/40 bg-red-500/15 text-red-700';

/**
 * One pill you can switch on and off. It is a real (visually hidden) checkbox, so it works with the keyboard and screen readers; the pill
 * beside it draws the state. Give it `names` (and the current `selected`) to make it a tri-state pill that shows a dash when only some of
 * those permissions are chosen — used for a whole area and for an action across every area.
 */
function Chip({ names, selected, onToggle, label, title, disabled, tone, children }) {
  const ref = useRef(null);
  const chosen = names.filter((n) => selected.includes(n)).length;
  const all = names.length > 0 && chosen === names.length;
  const some = chosen > 0 && !all;

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some;
  }, [some]);

  const look = all || some ? (tone === 'danger' && all ? CHIP_ON_DANGER : CHIP_ON) : CHIP_OFF;
  const off = disabled || names.length === 0;

  return (
    <label className={`relative inline-flex ${off ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`} title={title}>
      <input ref={ref} type="checkbox" className="peer sr-only" checked={all} disabled={off} onChange={() => onToggle(names, !all)} aria-label={label} />
      <span className={`${CHIP} ${look}`}>
        {all && <Check size={13} strokeWidth={3} aria-hidden="true" />}
        {some && <Minus size={13} strokeWidth={3} aria-hidden="true" />}
        {children}
      </span>
    </label>
  );
}

/**
 * Pick permissions as a set of cards: one card per area (Vehicle, Booking, …), each holding a pill per action (Read, Create, Update,
 * Delete, Manage, then Approve, Review, Upload…). Tap a pill to switch it on or off. The button on a card's header picks the whole area,
 * and the "Quick pick" pills at the top pick one action across every area at once.
 *
 * @param {Array<{ permissionName: string, description?: string }>} available — every permission that exists
 * @param {string[]} value — the chosen permission names
 * @param {(names: string[]) => void} onChange
 * @param {boolean} [disabled]
 */
export default function PermissionPicker({ available = [], value = [], onChange, disabled = false }) {
  const descriptions = Object.fromEntries(available.map((p) => [p.permissionName, p.description]));
  // A permission the role already has stays in the picker even if it is missing from the permission list.
  const names = [...new Set([...available.map((p) => p.permissionName), ...value])];
  const groups = groupPermissions(names);

  const toggleMany = (list, on) => onChange(on ? [...new Set([...value, ...list])] : value.filter((n) => !list.includes(n)));

  if (groups.length === 0) return <p className="text-sm text-muted">There are no permissions yet. Add some on the Permissions tab first.</p>;

  const columnNames = (action) => names.filter((n) => actionKey(n) === action);
  const quickPicks = STANDARD.filter((action) => columnNames(action).length > 0);

  return (
    <div className="flex flex-col gap-4" role="group" aria-label="Permissions">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-ink/10 bg-black/[0.03] px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted">Quick pick</span>
        {quickPicks.map((action) => (
          <Chip key={action} names={columnNames(action)} selected={value} onToggle={toggleMany} label={`All ${action} permissions`} title={`${permissionAction(action)} in every area`} disabled={disabled} tone={action === 'DELETE' ? 'danger' : undefined}>
            {permissionAction(action)}
          </Chip>
        ))}
        {value.length > 0 && (
          <Button size="sm" className="ml-auto" disabled={disabled} onClick={() => onChange([])}>
            Clear all
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {groups.map(({ group, names: list }) => {
          const ordered = [...list].sort((a, b) => actionRank(a) - actionRank(b) || a.localeCompare(b));
          const chosen = list.filter((n) => value.includes(n)).length;
          const percent = Math.round((chosen / list.length) * 100);
          const all = chosen === list.length;
          return (
            <div key={group} role="group" aria-labelledby={`perm-area-${group}`} className={`flex flex-col gap-3 rounded-2xl border p-4 transition-colors ${chosen > 0 ? 'border-accent/25 bg-black/[0.05]' : 'border-ink/10 bg-black/[0.03]'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex items-baseline gap-2">
                    <span id={`perm-area-${group}`} className="text-sm font-semibold uppercase tracking-widest text-brand-gold-deep">
                      {group}
                    </span>
                    <span className="text-xs tabular-nums text-muted">
                      {chosen}/{list.length}
                    </span>
                  </div>
                  <div className="h-1 w-28 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
                    <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${percent}%` }} />
                  </div>
                </div>
                <Chip names={list} selected={value} onToggle={toggleMany} label={`All ${group} permissions`} title={all ? `Clear every ${group.toLowerCase()} permission` : `Give every ${group.toLowerCase()} permission`} disabled={disabled}>
                  {all ? 'Clear' : 'Select all'}
                </Chip>
              </div>

              <div className="flex flex-wrap gap-2">
                {ordered.map((name) => (
                  <Chip key={name} names={[name]} selected={value} onToggle={toggleMany} label={name} title={descriptions[name] || name} disabled={disabled} tone={actionKey(name) === 'DELETE' ? 'danger' : undefined}>
                    {permissionAction(actionKey(name))}
                  </Chip>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
