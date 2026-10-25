// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { useAuthStore } from '../../store/authStore';
import AuthImage from './AuthImage';

const HOST = import.meta.env.VITE_API_BASE_URL;

function renderImage(props) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthImage alt="Prado" {...props} />
    </QueryClientProvider>
  );
}

beforeAll(() => {
  // jsdom has no object-URL support.
  URL.createObjectURL = vi.fn(() => 'blob:mock-photo');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null }));
});

describe('AuthImage', () => {
  it('shimmers while the photo is on its way, then fades it in once it has loaded', () => {
    renderImage({ src: 'blob:already-here', className: 'h-full w-full' });
    const img = screen.getByRole('img', { name: 'Prado' });
    expect(img).toHaveClass('photo-shimmer', 'h-full');
    fireEvent.load(img);
    expect(img).not.toHaveClass('photo-shimmer');
    expect(img).toHaveClass('photo-fade-in');
  });

  it('shimmers in place of the photo while a signed-in download is still running', () => {
    server.use(http.get(`${HOST}/uploads/vehicles/slow.png`, () => new Promise(() => {})));
    act(() => useAuthStore.setState({ token: 't' }));
    renderImage({ src: '/uploads/vehicles/slow.png' });
    const placeholder = screen.getByRole('img', { name: 'Loading Prado' });
    expect(placeholder).toHaveAttribute('aria-busy', 'true');
    expect(placeholder).toHaveClass('photo-shimmer');
  });

  it('downloads the photo with the login token and shows it from a blob when signed in', async () => {
    let sentAuth;
    server.use(
      http.get(`${HOST}/uploads/vehicles/a.png`, ({ request }) => {
        sentAuth = request.headers.get('authorization');
        return new HttpResponse(new Uint8Array([137, 80, 78, 71]), { headers: { 'Content-Type': 'image/png' } });
      })
    );
    act(() => useAuthStore.getState().setToken('header.payload.sig'));
    renderImage({ src: '/uploads/vehicles/a.png' });

    const img = await screen.findByRole('img', { name: 'Prado' });
    expect(img).toHaveAttribute('src', 'blob:mock-photo');
    expect(sentAuth).toBe('Bearer header.payload.sig');
  });

  it('shows the fallback when the photo cannot be loaded', async () => {
    server.use(http.get(`${HOST}/uploads/vehicles/missing.png`, () => new HttpResponse(null, { status: 404 })));
    act(() => useAuthStore.setState({ token: 'test-token', user: { id: 'u1', roles: [] } }));
    renderImage({ src: '/uploads/vehicles/missing.png', fallback: <p>No photo</p> });

    expect(await screen.findByText('No photo')).toBeInTheDocument();
  });

  it('uses a plain image when signed out, and the fallback if the server refuses it', async () => {
    renderImage({ src: '/uploads/vehicles/a.png', fallback: <p>No photo</p> });

    const img = screen.getByRole('img', { name: 'Prado' });
    expect(img).toHaveAttribute('src', `${HOST}/uploads/vehicles/a.png`);

    act(() => {
      img.dispatchEvent(new Event('error'));
    });
    await waitFor(() => expect(screen.getByText('No photo')).toBeInTheDocument());
  });

  it('shows a local blob URL directly, without fetching', () => {
    renderImage({ src: 'blob:local-preview' });
    expect(screen.getByRole('img', { name: 'Prado' })).toHaveAttribute('src', 'blob:local-preview');
  });

  it('renders the fallback when there is no source at all', () => {
    renderImage({ src: undefined, fallback: <p>No photo</p> });
    expect(screen.getByText('No photo')).toBeInTheDocument();
  });
});
