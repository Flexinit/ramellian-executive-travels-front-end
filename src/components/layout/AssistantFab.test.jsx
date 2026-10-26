// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AssistantFab from './AssistantFab';
import { useAuthStore } from '../../store/authStore';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

afterEach(() => {
  useAuthStore.setState({ token: null, user: null });
});

function renderAt(route) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AssistantFab />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function signIn() {
  act(() => useAuthStore.setState({ token: 'abc', user: { id: '1', email: 'j@x.com', roles: ['RENTER'] } }));
}

describe('AssistantFab — on a phone', () => {
  it('slides away while scrolling down, so it never sits on a Book button, and comes back on scrolling up', async () => {
    const original = window.matchMedia;
    window.matchMedia = (q) => ({ matches: q.includes('max-width'), addEventListener() {}, removeEventListener() {} });
    try {
      renderAt('/vehicles');
      const button = await screen.findByRole('button', { name: /chat with the assistant/i });
      const scrollTo = (y) => act(() => {
        window.scrollY = y;
        window.dispatchEvent(new Event('scroll'));
      });

      scrollTo(400);
      expect(button.className).toContain('opacity-0');
      scrollTo(200);
      expect(button.className).not.toContain('opacity-0');
    } finally {
      window.matchMedia = original;
      window.scrollY = 0;
    }
  });
});

describe('AssistantFab', () => {
  it('is global — shown on a public page for a signed-out visitor too', async () => {
    renderAt('/');
    expect(await screen.findByRole('button', { name: /chat with the assistant/i })).toBeInTheDocument();
  });

  it('shown for a signed-in person too, once the settings say the assistant is on', async () => {
    signIn();
    renderAt('/dashboard');
    expect(await screen.findByRole('button', { name: /chat with the assistant/i })).toBeInTheDocument();
  });

  it('hides itself on the Assistant page, where opening it would do nothing', () => {
    signIn();
    renderAt('/assistant');
    expect(screen.queryByRole('button', { name: /chat with the assistant/i })).not.toBeInTheDocument();
  });

  it('prompts a signed-out visitor to log in or create an account, instead of the chat box', async () => {
    const user = userEvent.setup();
    renderAt('/');

    await user.click(await screen.findByRole('button', { name: /chat with the assistant/i }));

    expect(screen.getByText(/log in or create an account/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^log in$/i })).toHaveAttribute('href', '/auth/login');
    expect(screen.getByRole('link', { name: /create account/i })).toHaveAttribute('href', '/auth/register');
    expect(screen.queryByLabelText(/message the assistant/i)).not.toBeInTheDocument();
  });

  it('opens the real chat panel in place for a signed-in person, without navigating to a new page', async () => {
    const user = userEvent.setup();
    signIn();
    renderAt('/dashboard');

    expect(screen.queryByText(/chat with us/i)).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /chat with the assistant/i }));

    expect(screen.getByText(/chat with us/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message the assistant/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('closes again on a second click', async () => {
    const user = userEvent.setup();
    signIn();
    renderAt('/dashboard');

    await user.click(await screen.findByRole('button', { name: /chat with the assistant/i }));
    expect(screen.getByText(/chat with us/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close chat/i }));
    expect(screen.queryByText(/chat with us/i)).not.toBeInTheDocument();
  });
});

describe('AssistantFab — switched off by an administrator', () => {
  it('is hidden for a signed-in person once the platform settings say the assistant is off', async () => {
    server.use(http.get(`${BASE}/platform-settings`, () => HttpResponse.json({ id: 's1', commissionRatePct: 1, botAssistantEnabled: false })));
    signIn();
    renderAt('/vehicles');

    await waitFor(() => expect(screen.queryByRole('button', { name: /chat with the assistant/i })).not.toBeInTheDocument());
  });
});

describe('AssistantFab — in a conversation', () => {
  it('stays out of the way of the message box (its Send button is where the chat button floats)', () => {
    signIn();
    renderAt('/messages/user/u2');
    expect(screen.queryByRole('button', { name: /chat with the assistant/i })).not.toBeInTheDocument();
  });
});

describe('AssistantFab — following the backend setting', () => {
  it("doesn't flash up for a signed-in person while the setting is still loading", () => {
    server.use(http.get(`${BASE}/platform-settings`, () => new Promise(() => {})));
    signIn();
    renderAt('/vehicles');
    expect(screen.queryByRole('button', { name: /chat with the assistant/i })).not.toBeInTheDocument();
  });

  it('hidden for a visitor too when the backend says the assistant is off (GET /bot/status)', async () => {
    server.use(http.get(`${BASE}/bot/status`, () => HttpResponse.json({ enabled: false })));
    renderAt('/vehicles');
    await waitFor(() => expect(screen.queryByRole('button', { name: /chat with the assistant/i })).not.toBeInTheDocument());
  });

  it('a backend without /bot/status (401): signed in, it follows the settings instead', async () => {
    server.use(
      http.get(`${BASE}/bot/status`, () => HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })),
      http.get(`${BASE}/platform-settings`, () => HttpResponse.json({ id: 's1', commissionRatePct: 1, botAssistantEnabled: false }))
    );
    signIn();
    renderAt('/vehicles');
    await waitFor(() => expect(screen.queryByRole('button', { name: /chat with the assistant/i })).not.toBeInTheDocument());
  });
});
