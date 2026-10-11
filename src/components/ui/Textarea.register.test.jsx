// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import Textarea from './Textarea';

function Form({ onWatch }) {
  const { register, watch } = useForm({ defaultValues: { message: '' } });
  onWatch(watch('message'));
  return <Textarea label="Message" maxLength={100} register={register('message')} />;
}

describe('Textarea with react-hook-form', () => {
  it('lets the form hear every edit (its onChange must not replace register\'s)', async () => {
    const user = userEvent.setup();
    let latest;
    render(<Form onWatch={(v) => (latest = v)} />);

    await user.type(screen.getByLabelText('Message'), 'hello');

    expect(latest).toBe('hello');
  });

  it('counts characters as they are typed', async () => {
    const user = userEvent.setup();
    render(<Form onWatch={() => {}} />);

    await user.type(screen.getByLabelText('Message'), 'hello');

    expect(screen.getByText('5 / 100')).toBeInTheDocument();
  });
});
