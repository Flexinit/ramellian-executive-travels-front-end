import { useCallback, useEffect, useRef, useState } from 'react';
import { clearDraft, loadDraft, saveDraft } from '../lib/formDraft';

/**
 * Keeps a react-hook-form form's unsaved input across reloads (see
 * lib/formDraft.js for what's stored and when it's dropped).
 *
 *  - Once `ready` (e.g. the server values have been loaded into the form), a
 *    saved draft is laid over the form: only values that differ from what the
 *    form currently holds are set, and marked dirty, so "send only what
 *    changed" logic still compares against the server's values.
 *  - After that, every change is saved (debounced) while the form is dirty. As
 *    soon as the form is pristine again — after a successful save/reset — the
 *    draft is deleted, so a finished form never comes back.
 *
 * @param {object} opts
 * @param {string|null} opts.key — draft key; null/undefined disables the hook
 * @param {Function} opts.watch @param {Function} opts.getValues @param {Function} opts.setValue — from useForm
 * @param {boolean} opts.isDirty — `formState.isDirty`
 * @param {boolean} [opts.ready=true]
 * @param {string[]} [opts.exclude] — field names never stored (e.g. passwords)
 * @param {any} [opts.extra] — one extra piece of state to keep alongside (e.g. a wizard step)
 * @param {(extra:any)=>void} [opts.onRestoreExtra]
 * @param {Function} [opts.resetToBase] — how to put the form back to its untouched values (for `discard`)
 * @returns {{ restored: boolean, discard: () => void }}
 */
export function useFormDraft({ key, watch, getValues, setValue, isDirty, ready = true, exclude = [], extra, onRestoreExtra, resetToBase }) {
  const [restored, setRestored] = useState(false);
  const applied = useRef(false);
  const dirtyRef = useRef(isDirty);
  const extraRef = useRef(extra);
  const excludeRef = useRef(exclude);
  dirtyRef.current = isDirty;
  extraRef.current = extra;
  excludeRef.current = exclude;

  const persist = useCallback(() => {
    if (!key || !applied.current) return;
    if (!dirtyRef.current) {
      clearDraft(key);
      return;
    }
    const values = Object.fromEntries(Object.entries(getValues()).filter(([name]) => !excludeRef.current.includes(name)));
    saveDraft(key, { values, extra: extraRef.current });
  }, [key, getValues]);

  // Restore once, when the form is ready.
  useEffect(() => {
    if (!key || !ready || applied.current) return;
    applied.current = true;
    const draft = loadDraft(key);
    if (!draft) return;

    const current = getValues();
    let changed = false;
    for (const [name, value] of Object.entries(draft.values || {})) {
      if (excludeRef.current.includes(name)) continue;
      if (JSON.stringify(current[name]) !== JSON.stringify(value)) {
        setValue(name, value, { shouldDirty: true });
        changed = true;
      }
    }
    if (draft.extra !== undefined && draft.extra !== extraRef.current) {
      onRestoreExtra?.(draft.extra);
      changed = true;
    }
    if (changed) setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  // Save on change (debounced). A pending save is flushed right away when the page is hidden/reloaded or the
  // form unmounts, so what was typed in the last moments before a reload isn't lost.
  useEffect(() => {
    if (!key || !ready) return undefined;
    let timer;
    let pending = false;
    const flush = () => {
      if (!pending) return;
      clearTimeout(timer);
      pending = false;
      persist();
    };
    const subscription = watch(() => {
      pending = true;
      clearTimeout(timer);
      timer = setTimeout(flush, 300);
    });
    window.addEventListener('pagehide', flush);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [key, ready, watch, persist]);

  // Also save when the dirty state flips or the extra state (e.g. the step) changes.
  useEffect(() => {
    if (!key || !ready) return undefined;
    let pending = true;
    const timer = setTimeout(() => {
      pending = false;
      persist();
    }, 0);
    return () => {
      clearTimeout(timer);
      if (pending) persist();
    };
  }, [key, ready, isDirty, extra, persist]);

  const discard = useCallback(() => {
    if (key) clearDraft(key);
    setRestored(false);
    resetToBase?.();
  }, [key, resetToBase]);

  return { restored, discard };
}
