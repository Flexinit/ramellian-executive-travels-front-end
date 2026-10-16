// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RememberMe from './RememberMe';
import Input from '../ui/Input';
import { useAuthStore } from '../../store/authStore';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '');
const token = `${b64({ alg: 'HS384' })}.${b64({ userId: 'u1', email: 'a@example.com', roles: ['RENTER'], exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;

afterEach(() => {
  useAuthStore.getState().clearAuth();
  localStorage.clear();
  sessionStorage.clear();
});

describe('Remember me', () => {
  it('keeps the sign-in after the browser closes only when ticked', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<RememberMe />);

    useAuthStore.getState().setToken(token);
    expect(localStorage.getItem('auth:token')).toBeNull();
    expect(sessionStorage.getItem('auth:token')).toBe(token);

    await user.click(screen.getByLabelText(/remember me/i));
    useAuthStore.getState().setToken(token);
    expect(localStorage.getItem('auth:token')).toBe(token);
    unmount();
  });

  it('forgets it on log out', async () => {
    const user = userEvent.setup();
    render(<RememberMe />);
    await user.click(screen.getByLabelText(/remember me/i));
    useAuthStore.getState().setToken(token);

    useAuthStore.getState().clearAuth();
    expect(localStorage.getItem('auth:token')).toBeNull();
  });
});

describe('Password fields', () => {
  it('can show and hide what was typed', async () => {
    const user = userEvent.setup();
    render(<Input label="Password" type="password" />);
    const field = screen.getByLabelText('Password');
    expect(field).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show characters/i }));
    expect(field).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: /hide characters/i }));
    expect(field).toHaveAttribute('type', 'password');
  });
});
