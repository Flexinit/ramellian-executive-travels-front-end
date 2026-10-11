// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import AssistantThread from './AssistantThread';

const BASE = 'http://192.168.8.11:8080/api/v1';

function renderThread() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AssistantThread />
    </QueryClientProvider>
  );
}

describe('AssistantThread', () => {
  it('shows a prompt and nothing else until a message is sent', () => {
    renderThread();
    expect(screen.getByText(/ask about a vehicle/i)).toBeInTheDocument();
  });

  it('sends what is typed, and shows both sides of the exchange', async () => {
    const user = userEvent.setup();
    let sentBody;
    server.use(
      http.post(`${BASE}/bot/inapp`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ text: 'The Prado is available Friday to Sunday.', media: [] });
      })
    );
    renderThread();

    await user.type(screen.getByLabelText(/message the assistant/i), 'Is the Prado free this weekend?');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(await screen.findByText('Is the Prado free this weekend?')).toBeInTheDocument();
    expect(await screen.findByText('The Prado is available Friday to Sunday.')).toBeInTheDocument();
    expect(sentBody).toEqual({ message: 'Is the Prado free this weekend?' });
  });

  it('clears the box once sent, so the next message starts fresh', async () => {
    const user = userEvent.setup();
    server.use(http.post(`${BASE}/bot/inapp`, () => HttpResponse.json({ text: 'Sure.', media: [] })));
    renderThread();

    const box = screen.getByLabelText(/message the assistant/i);
    await user.type(box, 'Hello');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(box).toHaveValue('');
  });

  it('shows an attachment the assistant sends back, with its caption', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE}/bot/inapp`, () =>
        HttpResponse.json({
          text: 'Here is the receipt.',
          media: [{ type: 'application/pdf', url: 'https://files.example.com/receipt.pdf', caption: 'Your receipt', fileName: 'receipt.pdf' }],
        })
      )
    );
    renderThread();

    await user.type(screen.getByLabelText(/message the assistant/i), 'Can I get my receipt?');
    await user.click(screen.getByRole('button', { name: /send/i }));

    const link = await screen.findByRole('link', { name: /your receipt/i });
    expect(link).toHaveAttribute('href', 'https://files.example.com/receipt.pdf');
  });

  it('shows a readable message in the thread itself when the bot fails to reply', async () => {
    const user = userEvent.setup();
    server.use(http.post(`${BASE}/bot/inapp`, () => HttpResponse.json({ message: 'Service unavailable' }, { status: 503 })));
    renderThread();

    await user.type(screen.getByLabelText(/message the assistant/i), 'Hello?');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(await screen.findByText(/couldn't reply/i)).toBeInTheDocument();
  });
});
