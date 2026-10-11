// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { saveDraft, loadDraft, clearDraft } from './formDraft';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('formDraft', () => {
  it('saves and loads a draft', () => {
    saveDraft('k', { values: { name: 'Ann' } });
    expect(loadDraft('k')).toEqual({ values: { name: 'Ann' } });
  });

  it('returns null when nothing was saved', () => {
    expect(loadDraft('missing')).toBeNull();
  });

  it('clears a draft', () => {
    saveDraft('k', { a: 1 });
    clearDraft('k');
    expect(loadDraft('k')).toBeNull();
  });

  it('keeps drafts under separate keys apart', () => {
    saveDraft('personal.1', { who: 'one' });
    saveDraft('personal.2', { who: 'two' });
    expect(loadDraft('personal.1')).toEqual({ who: 'one' });
    expect(loadDraft('personal.2')).toEqual({ who: 'two' });
  });

  it('drops a draft older than a week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T00:00:00Z'));
    saveDraft('k', { a: 1 });

    vi.setSystemTime(new Date('2026-09-07T23:00:00Z'));
    expect(loadDraft('k')).toEqual({ a: 1 });

    vi.setSystemTime(new Date('2026-09-09T00:00:00Z'));
    expect(loadDraft('k')).toBeNull();
    expect(localStorage.getItem('ret.draft.k')).toBeNull();
  });

  it('ignores a corrupt entry instead of throwing', () => {
    localStorage.setItem('ret.draft.k', '{not json');
    expect(loadDraft('k')).toBeNull();
  });

  it('never throws when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveDraft('k', { a: 1 })).not.toThrow();
    expect(loadDraft('k')).toBeNull();
  });
});
