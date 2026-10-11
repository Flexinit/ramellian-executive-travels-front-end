// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import { useCurrentUser, useUpdateProfile, useUpdateOwnerProfile, useSyncCurrentUser, apiErrorMessage } from './useProfile';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function wrapper({ children }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  act(() => useAuthStore.setState({ token: 'test-token', user: { id: '1', email: 'test@example.com', roles: ['RENTER'] } }));
});

afterEach(() => {
  act(() => useAuthStore.getState().clearAuth());
});

describe('useCurrentUser', () => {
  it('fetches the current user when authenticated', async () => {
    const { result } = renderHook(() => useCurrentUser(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data.email).toBe('test@example.com');
  });

  it('does not fetch when unauthenticated', () => {
    act(() => useAuthStore.getState().clearAuth());
    const { result } = renderHook(() => useCurrentUser(), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useUpdateProfile', () => {
  it('PATCHes /users/me and merges the response into authStore', async () => {
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    act(() => {
      result.current.mutate({ firstName: 'Jane', lastName: 'Doe' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().user.firstName).toBe('Jane');
    expect(useAuthStore.getState().user.lastName).toBe('Doe');
    // Fields already in the store (from the JWT) survive the merge.
    expect(useAuthStore.getState().user.roles).toEqual(['RENTER']);
  });
});

describe('useUpdateOwnerProfile', () => {
  it('PUTs /users/me/owner-profile and merges the response into authStore', async () => {
    const { result } = renderHook(() => useUpdateOwnerProfile(), { wrapper });

    act(() => {
      result.current.mutate({ ownerType: 'INDIVIDUAL' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().user.ownerType).toBe('INDIVIDUAL');
  });
});

describe('useSyncCurrentUser', () => {
  it('merges GET /users/me into authStore once it resolves', async () => {
    server.use(
      http.get(`${BASE}/users/me`, () =>
        HttpResponse.json({ id: '1', email: 'test@example.com', firstName: 'Synced', lastName: 'User', roles: ['RENTER'] })
      )
    );

    renderHook(() => useSyncCurrentUser(), { wrapper });

    await waitFor(() => expect(useAuthStore.getState().user?.firstName).toBe('Synced'));
  });
});

describe('apiErrorMessage', () => {
  it("uses the backend's own message when it sends one", () => {
    const error = { response: { status: 400, data: { message: 'Phone number is invalid' } } };
    expect(apiErrorMessage(error, 'Could not save.')).toBe('Could not save. Phone number is invalid');
  });

  it('joins per-field validation errors', () => {
    const error = { response: { status: 400, data: { errors: [{ defaultMessage: 'must not be blank' }, { defaultMessage: 'too long' }] } } };
    expect(apiErrorMessage(error, 'Could not save.')).toBe('Could not save. must not be blank; too long');
  });

  it("reads the live backend's fieldErrors map", () => {
    const error = { response: { status: 400, data: { message: 'Validation failed', fieldErrors: { lastName: 'must not be blank' } } } };
    expect(apiErrorMessage(error, 'Could not save.')).toBe('Could not save. lastName: must not be blank');
  });

  it('falls back to the HTTP status when the body has nothing useful', () => {
    expect(apiErrorMessage({ response: { status: 403, data: '' } }, 'Could not save.')).toMatch(/^Could not save\. The server refused it \(403\) — your account may not have permission/);
    expect(apiErrorMessage({ response: { status: 404, data: '' } }, 'Could not save.')).toBe('Could not save. (server responded 404).');
  });

  it("calls a 5xx a server-side fault instead of echoing the backend's generic text", () => {
    const error = { response: { status: 500, data: { message: 'An unexpected error occurred' } } };
    expect(apiErrorMessage(error, 'Could not save.')).toMatch(/internal error \(500\).*not yours/i);
  });

  it('says so when the server could not be reached', () => {
    expect(apiErrorMessage({ message: 'Network Error' }, 'Could not save.')).toMatch(/couldn't reach the server/i);
    expect(apiErrorMessage({ code: 'ECONNABORTED' }, 'Could not save.')).toMatch(/too long to respond/i);
  });
});
