// @vitest-environment jsdom
import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { useFormDraft } from './useFormDraft';
import { loadDraft, saveDraft } from '../lib/formDraft';

const BASE = { name: 'Saved Name', secret: '' };

/** A tiny form wired to the hook the way the real forms are. */
function Harness({ draftKey = 'k', exclude = [], ready = true }) {
  const {
    register,
    watch,
    getValues,
    setValue,
    reset,
    formState: { isDirty, dirtyFields },
  } = useForm({ defaultValues: BASE });
  const [step, setStep] = useState(0);
  const { restored, discard } = useFormDraft({
    key: draftKey,
    watch,
    getValues,
    setValue,
    isDirty,
    ready,
    exclude,
    extra: step,
    onRestoreExtra: setStep,
    resetToBase: () => {
      reset(BASE);
      setStep(0);
    },
  });

  return (
    <form>
      <input aria-label="name" {...register('name')} />
      <input aria-label="secret" {...register('secret')} />
      <p data-testid="dirty">{Object.keys(dirtyFields).join(',')}</p>
      <p data-testid="step">{step}</p>
      <button type="button" onClick={() => setStep((s) => s + 1)}>next</button>
      <button type="button" onClick={() => reset(BASE)}>mark saved</button>
      {restored && <button type="button" onClick={discard}>discard</button>}
    </form>
  );
}

const draftSaved = (key = 'k') => waitFor(() => expect(loadDraft(key)).not.toBeNull());

describe('useFormDraft', () => {
  it('saves typed input and puts it back after a reload', async () => {
    const user = userEvent.setup();
    const first = render(<Harness />);
    await user.clear(screen.getByLabelText('name'));
    await user.type(screen.getByLabelText('name'), 'Typed Name');
    await draftSaved();
    first.unmount();

    render(<Harness />);
    expect(screen.getByLabelText('name')).toHaveValue('Typed Name');
    expect(screen.getByRole('button', { name: 'discard' })).toBeInTheDocument();
  });

  it('marks restored fields as changed relative to the saved values, so only real changes get sent', async () => {
    saveDraft('k', { values: { name: 'Draft Name', secret: '' } });
    render(<Harness />);

    await waitFor(() => expect(screen.getByLabelText('name')).toHaveValue('Draft Name'));
    // `secret` equals the base value, so it is not treated as edited; `name` is.
    expect(screen.getByTestId('dirty')).toHaveTextContent('name');
    expect(screen.getByTestId('dirty')).not.toHaveTextContent('secret');
  });

  it('never stores excluded fields', async () => {
    const user = userEvent.setup();
    render(<Harness exclude={['secret']} />);
    await user.type(screen.getByLabelText('name'), '!');
    await user.type(screen.getByLabelText('secret'), 'hunter2');
    await draftSaved();

    expect(JSON.stringify(loadDraft('k'))).not.toContain('hunter2');
  });

  it('also keeps the extra state (e.g. a wizard step)', async () => {
    const user = userEvent.setup();
    const first = render(<Harness />);
    await user.type(screen.getByLabelText('name'), '!');
    await user.click(screen.getByRole('button', { name: 'next' }));
    await waitFor(() => expect(loadDraft('k')?.extra).toBe(1));
    first.unmount();

    render(<Harness />);
    expect(screen.getByTestId('step')).toHaveTextContent('1');
  });

  it('deletes the draft as soon as the form is pristine again (after a successful save)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText('name'), '!');
    await draftSaved();

    await user.click(screen.getByRole('button', { name: 'mark saved' }));
    await waitFor(() => expect(loadDraft('k')).toBeNull());
  });

  it('"discard" throws the draft away and restores the untouched values', async () => {
    const user = userEvent.setup();
    saveDraft('k', { values: { name: 'Draft Name', secret: '' } });
    render(<Harness />);
    await waitFor(() => expect(screen.getByLabelText('name')).toHaveValue('Draft Name'));

    await user.click(screen.getByRole('button', { name: 'discard' }));

    expect(screen.getByLabelText('name')).toHaveValue('Saved Name');
    expect(loadDraft('k')).toBeNull();
    expect(screen.queryByRole('button', { name: 'discard' })).not.toBeInTheDocument();
  });

  it('waits until the form is ready before restoring', async () => {
    saveDraft('k', { values: { name: 'Draft Name', secret: '' } });
    const view = render(<Harness ready={false} />);
    expect(screen.getByLabelText('name')).toHaveValue('Saved Name');

    view.rerender(<Harness ready />);
    await waitFor(() => expect(screen.getByLabelText('name')).toHaveValue('Draft Name'));
  });

  it('does nothing without a key', async () => {
    const user = userEvent.setup();
    render(<Harness draftKey={null} />);
    await user.type(screen.getByLabelText('name'), '!');
    await new Promise((r) => setTimeout(r, 450));

    expect(Object.keys(localStorage).filter((k) => k.startsWith('ret.draft.'))).toEqual([]);
  });
});
