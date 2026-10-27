// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { api, apiGet, apiPost, apiPatch, _setTokenGetter } from './api';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

describe('api — request interceptor', () => {
  beforeEach(() => {
    _setTokenGetter(null);
  });

  it('attaches Authorization header when token getter returns a token', async () => {
    _setTokenGetter(() => 'test-token-123');

    let capturedHeader;
    server.use(
      http.get(`${BASE}/test-auth`, ({ request }) => {
        capturedHeader = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      })
    );

    await apiGet('/test-auth');
    expect(capturedHeader).toBe('Bearer test-token-123');
  });

  it('does not attach Authorization header when no token getter is set', async () => {
    let capturedHeader;
    server.use(
      http.get(`${BASE}/test-no-auth`, ({ request }) => {
        capturedHeader = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      })
    );

    await apiGet('/test-no-auth');
    expect(capturedHeader).toBeNull();
  });

  it('sends no token when logging in — an expired one would make the backend refuse the login', async () => {
    _setTokenGetter(() => 'expired-token');
    const headers = [];
    server.use(
      http.post(`${BASE}/auth/login`, ({ request }) => {
        headers.push(request.headers.get('Authorization'));
        return HttpResponse.json({ token: 'new-token' });
      }),
      http.post(`${BASE}/auth/google`, ({ request }) => {
        headers.push(request.headers.get('Authorization'));
        return HttpResponse.json({ token: 'new-token' });
      })
    );

    await apiPost('/auth/login', { email: 'a@example.com', password: 'secret' });
    await apiPost('/auth/google', { idToken: 'x' });
    expect(headers).toEqual([null, null]);
  });
});

describe('api — response interceptor', () => {
  it('dispatches "auth:expired" event on 401 response', async () => {
    server.use(
      http.get(`${BASE}/protected`, () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
      )
    );

    const handler = vi.fn();
    window.addEventListener('auth:expired', handler);

    await apiGet('/protected').catch(() => {});

    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener('auth:expired', handler);
  });

  it('rejects the promise on error responses', async () => {
    server.use(
      http.get(`${BASE}/error`, () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 })
      )
    );

    await expect(apiGet('/error')).rejects.toThrow();
  });
});

describe('apiGet', () => {
  it('returns response data on success', async () => {
    server.use(
      http.get(`${BASE}/vehicles`, () =>
        HttpResponse.json({ content: [], totalElements: 0 })
      )
    );

    const data = await apiGet('/vehicles');
    expect(data).toHaveProperty('content');
    expect(data.totalElements).toBe(0);
  });

  it('passes query params to the request', async () => {
    let capturedUrl;
    server.use(
      http.get(`${BASE}/vehicles`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ content: [] });
      })
    );

    await apiGet('/vehicles', { location: 'Nairobi', minPrice: 4000 });
    expect(capturedUrl).toContain('location=Nairobi');
    expect(capturedUrl).toContain('minPrice=4000');
  });
});

describe('apiPost', () => {
  it('sends JSON body and returns response data', async () => {
    let capturedBody;
    server.use(
      http.post(`${BASE}/auth/login`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ accessToken: 'tok' });
      })
    );

    const data = await apiPost('/auth/login', { email: 'a@b.com', password: 'pass' });
    expect(capturedBody).toEqual({ email: 'a@b.com', password: 'pass' });
    expect(data.accessToken).toBe('tok');
  });
});

describe('apiPatch', () => {
  it('sends a PATCH request with a JSON body and returns response data', async () => {
    let capturedBody;
    server.use(
      http.patch(`${BASE}/users/me`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id: '1', firstName: 'Jane' });
      })
    );

    const data = await apiPatch('/users/me', { firstName: 'Jane' });
    expect(capturedBody).toEqual({ firstName: 'Jane' });
    expect(data.firstName).toBe('Jane');
  });
});
