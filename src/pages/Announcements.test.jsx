// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse, delay } from 'msw';
import { axe } from 'jest-axe';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import AdminAnnouncementsPage from './AdminAnnouncementsPage';
import AdminUserDetailPage from './AdminUserDetailPage';
import { buildMailtoLinks, cleanAnnouncement, emailAddresses, recipientsFor } from '../lib/announcements';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

const ME = { id: 'me-1', email: 'felix@example.com', firstName: 'Felix', lastName: 'Admin', enabled: true, roles: ['SUPER_ADMIN', 'CAR_OWNER'] };
const ANN = { id: 'u-2', email: 'ann@example.com', firstName: 'Ann', lastName: 'Renter', enabled: true, roles: [] };
const BEN = { id: 'u-3', email: 'ben@example.com', firstName: 'Ben', lastName: 'Owner', enabled: true, roles: ['CAR_OWNER'] };
const CAL = { id: 'u-4', email: 'cal@example.com', firstName: 'Cal', lastName: 'Off', enabled: false, roles: ['CAR_OWNER'] };
const DEE = { id: 'u-5', email: 'dee@example.com', firstName: 'Dee', lastName: 'Manager', enabled: true, roles: ['MANAGE'] };
const USERS = [ME, ANN, BEN, CAL, DEE];

function renderUi(element, route = '/admin/announcements') {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MemoryRouter initialEntries={[route]}>{element}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

beforeEach(() => {
  act(() => useAuthStore.setState({ token: 't', user: { id: 'me-1', email: 'felix@example.com', roles: ['ADMIN'] } }));
  server.use(http.get(`${BASE}/users/admin`, () => HttpResponse.json(USERS)));
});

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null, mode: null }));
});

describe('recipientsFor', () => {
  it('everyone who is switched on, except the sender', () => {
    expect(recipientsFor(USERS, 'ALL', 'me-1').map((u) => u.id)).toEqual(['u-2', 'u-3', 'u-5']);
  });

  it('narrows to a group; a plain renter (no role) is a renter', () => {
    expect(recipientsFor(USERS, 'CAR_RENTER', 'me-1').map((u) => u.id)).toEqual(['u-2']);
    expect(recipientsFor(USERS, 'CAR_OWNER', 'me-1').map((u) => u.id)).toEqual(['u-3']); // Cal is off, Felix is the sender
    expect(recipientsFor(USERS, 'MANAGE', 'me-1').map((u) => u.id)).toEqual(['u-5']);
    expect(recipientsFor(USERS, 'ADMIN').map((u) => u.id)).toEqual(['me-1']);
  });
});

describe('cleanAnnouncement', () => {
  it('trims, and removes phone numbers', () => {
    const cleaned = cleanAnnouncement('  Call us on 0712345678 today  ');
    expect(cleaned.removedPhone).toBe(true);
    expect(cleaned.text).not.toMatch(/0712345678/);
    expect(cleanAnnouncement('  hello ').text).toBe('hello');
    expect(cleanAnnouncement('hello').removedPhone).toBe(false);
  });
});

describe('email links', () => {
  it('lists each address once', () => {
    expect(emailAddresses([{ email: 'a@x.com' }, { email: ' a@x.com ' }, { email: '' }, {}, { email: 'b@x.com' }])).toEqual(['a@x.com', 'b@x.com']);
  });

  it('opens an email with everyone in Bcc, and the subject and message filled in', () => {
    const { links, tooLong } = buildMailtoLinks({ addresses: ['a@x.com', 'b@x.com'], subject: 'Hi there', body: 'Line one\nLine two & more' });
    expect(tooLong).toBe(false);
    expect(links).toHaveLength(1);
    expect(links[0].count).toBe(2);
    expect(links[0].href).toBe('mailto:?bcc=a@x.com,b@x.com&subject=Hi%20there&body=Line%20one%0ALine%20two%20%26%20more');
  });

  it('splits the recipients across several links so none is too long', () => {
    const addresses = Array.from({ length: 60 }, (_, i) => `person${i}@example.com`);
    const { links } = buildMailtoLinks({ addresses, subject: 'S', body: 'B', maxLength: 500 });
    expect(links.length).toBeGreaterThan(1);
    expect(links.every((l) => l.href.length <= 500)).toBe(true);
    expect(links.reduce((sum, l) => sum + l.count, 0)).toBe(60);
    expect(links.map((l) => l.href).join('')).toContain('person59@example.com');
  });

  it('says when the message is too long to fit in a link at all', () => {
    const result = buildMailtoLinks({ addresses: ['a@x.com'], subject: 'S', body: 'x'.repeat(3000) });
    expect(result.tooLong).toBe(true);
    expect(result.links).toEqual([]);
  });

  it('gives nothing to open when there is nobody to send to', () => {
    expect(buildMailtoLinks({ addresses: [], subject: 'S', body: 'B' })).toEqual({ tooLong: false, links: [] });
  });
});

describe('AdminAnnouncementsPage', () => {
  it('counts who it would go to, and changes with the group', async () => {
    const user = userEvent.setup();
    renderUi(<AdminAnnouncementsPage />);
    expect(await screen.findByText(/3 people/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Send to'), 'CAR_OWNER');
    expect(await screen.findByText(/1 person /)).toBeInTheDocument();
  });

  it("can't be sent without a message", async () => {
    renderUi(<AdminAnnouncementsPage />);
    await screen.findByText(/3 people/);
    expect(screen.getByRole('button', { name: /review and send/i })).toBeDisabled();
  });

  it('asks first, showing who and what, and sends nothing until confirmed', async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(http.post(`${BASE}/chat/messages`, () => { calls += 1; return HttpResponse.json({ id: 'm' }, { status: 201 }); }));
    renderUi(<AdminAnnouncementsPage />);
    await screen.findByText(/3 people/);
    await user.type(screen.getByLabelText('Message'), 'Maintenance tonight at midnight');
    await user.click(screen.getByRole('button', { name: /review and send/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('3 people')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('What will be sent')).toHaveTextContent('Maintenance tonight at midnight');
    expect(calls).toBe(0);
    await user.click(within(dialog).getByRole('button', { name: 'Back' }));
    expect(calls).toBe(0);
  });

  it('sends a direct message to each person in the group — not to the sender or a switched-off account', async () => {
    const user = userEvent.setup();
    const sent = [];
    server.use(
      http.post(`${BASE}/chat/messages`, async ({ request }) => {
        sent.push(await request.json());
        return HttpResponse.json({ id: `m${sent.length}` }, { status: 201 });
      })
    );
    renderUi(<AdminAnnouncementsPage />);
    await screen.findByText(/3 people/);
    await user.type(screen.getByLabelText('Message'), 'New rates from Monday');
    await user.click(screen.getByRole('button', { name: /review and send/i }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Send now' }));

    expect(await screen.findByText('Sent to 3 people.')).toBeInTheDocument();
    expect(sent.map((m) => m.recipientId).sort()).toEqual(['u-2', 'u-3', 'u-5']);
    expect(sent.every((m) => m.message === 'New rates from Monday')).toBe(true);
    expect(sent.some((m) => m.recipientId === 'me-1' || m.recipientId === 'u-4')).toBe(false);
  });

  it('never sends a phone number', async () => {
    const user = userEvent.setup();
    const sent = [];
    server.use(http.post(`${BASE}/chat/messages`, async ({ request }) => { sent.push(await request.json()); return HttpResponse.json({ id: 'm' }, { status: 201 }); }));
    renderUi(<AdminAnnouncementsPage />);
    await screen.findByText(/3 people/);
    await user.type(screen.getByLabelText('Message'), 'Call 0712345678 now');
    await user.click(screen.getByRole('button', { name: /review and send/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/phone number in your text was removed/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Send now' }));
    await screen.findByText('Sent to 3 people.');
    expect(sent.every((m) => !/0712345678/.test(m.message))).toBe(true);
  });

  it('lists anyone it could not reach and can try just those again', async () => {
    const user = userEvent.setup();
    const attempts = [];
    let benFails = true;
    server.use(
      http.post(`${BASE}/chat/messages`, async ({ request }) => {
        const body = await request.json();
        attempts.push(body.recipientId);
        if (body.recipientId === 'u-3' && benFails) return HttpResponse.json({ message: 'Recipient not found' }, { status: 404 });
        return HttpResponse.json({ id: 'm' }, { status: 201 });
      })
    );
    renderUi(<AdminAnnouncementsPage />);
    await screen.findByText(/3 people/);
    await user.type(screen.getByLabelText('Message'), 'Hello all');
    await user.click(screen.getByRole('button', { name: /review and send/i }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Send now' }));

    expect(await screen.findByText('Sent to 2 people.')).toBeInTheDocument();
    const failed = screen.getByRole('list', { name: 'Messages that could not be sent' });
    expect(within(failed).getByText(/Ben Owner/)).toBeInTheDocument();
    expect(within(failed).getByText(/recipient not found/i)).toBeInTheDocument();

    benFails = false;
    attempts.length = 0;
    await user.click(screen.getByRole('button', { name: 'Try the 1 again' }));
    await screen.findByText('Sent to 1 person.');
    expect(attempts).toEqual(['u-3']);
  });

  it('can be stopped part-way', async () => {
    const user = userEvent.setup();
    let count = 0;
    server.use(
      http.post(`${BASE}/chat/messages`, async () => {
        count += 1;
        await delay(80);
        return HttpResponse.json({ id: 'm' }, { status: 201 });
      })
    );
    renderUi(<AdminAnnouncementsPage />);
    await screen.findByText(/3 people/);
    await user.type(screen.getByLabelText('Message'), 'Hello all');
    await user.click(screen.getByRole('button', { name: /review and send/i }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Send now' }));
    await user.click(await screen.findByRole('button', { name: 'Stop sending' }));
    expect(await screen.findByText(/stopped/i)).toBeInTheDocument();
    expect(count).toBeLessThan(3);
  });

  it('can write another once done', async () => {
    const user = userEvent.setup();
    server.use(http.post(`${BASE}/chat/messages`, () => HttpResponse.json({ id: 'm' }, { status: 201 })));
    renderUi(<AdminAnnouncementsPage />);
    await screen.findByText(/3 people/);
    await user.type(screen.getByLabelText('Message'), 'Hi');
    await user.click(screen.getByRole('button', { name: /review and send/i }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Send now' }));
    await user.click(await screen.findByRole('button', { name: 'Write another' }));
    expect(screen.getByLabelText('Message')).toHaveValue('');
  });

  it('also offers the announcement by email — Bcc to the same people, with the subject and message', async () => {
    const user = userEvent.setup();
    renderUi(<AdminAnnouncementsPage />);
    await screen.findByText(/3 people/);
    expect(screen.queryByRole('region', { name: /also send by email/i })).not.toBeInTheDocument(); // nothing to send yet
    await user.type(screen.getByLabelText('Message'), 'Maintenance tonight');
    const section = await screen.findByRole('region', { name: /also send by email/i });
    const link = within(section).getByRole('link', { name: /open in my email app \(3 people\)/i });
    const href = link.getAttribute('href');
    expect(href).toMatch(/^mailto:\?bcc=/);
    expect(href).toContain('ann@example.com');
    expect(href).toContain('ben@example.com');
    expect(href).toContain('dee@example.com');
    expect(href).not.toContain('felix@example.com'); // the sender
    expect(href).not.toContain('cal@example.com'); // switched off
    expect(href).toContain('subject=Announcement%20from%20Ramellian%20Executive%20Travels');
    expect(href).toContain('body=Maintenance%20tonight');
  });

  it('lets the subject be changed, and follows the chosen group', async () => {
    const user = userEvent.setup();
    renderUi(<AdminAnnouncementsPage />);
    await screen.findByText(/3 people/);
    await user.type(screen.getByLabelText('Message'), 'Hi');
    await user.selectOptions(screen.getByLabelText('Send to'), 'CAR_OWNER');
    const section = await screen.findByRole('region', { name: /also send by email/i });
    const subject = within(section).getByLabelText('Email subject');
    await user.clear(subject);
    await user.type(subject, 'New rates');
    const href = within(section).getByRole('link').getAttribute('href');
    expect(href).toContain('subject=New%20rates');
    expect(href).toContain('ben@example.com');
    expect(href).not.toContain('ann@example.com');
  });

  it('removes phone numbers from the email too', async () => {
    const user = userEvent.setup();
    renderUi(<AdminAnnouncementsPage />);
    await screen.findByText(/3 people/);
    await user.type(screen.getByLabelText('Message'), 'Call 0712345678');
    const link = within(await screen.findByRole('region', { name: /also send by email/i })).getByRole('link');
    expect(decodeURIComponent(link.getAttribute('href'))).not.toContain('0712345678');
  });

  it('copies all the addresses', async () => {
    const user = userEvent.setup();
    renderUi(<AdminAnnouncementsPage />);
    await screen.findByText(/3 people/);
    await user.type(screen.getByLabelText('Message'), 'Hi');
    const section = await screen.findByRole('region', { name: /also send by email/i });
    await user.click(within(section).getByRole('button', { name: 'Copy all 3 addresses' }));
    expect(await navigator.clipboard.readText()).toBe('ann@example.com, ben@example.com, dee@example.com');
  });

  it('stays available after the in-app messages have been sent', async () => {
    const user = userEvent.setup();
    server.use(http.post(`${BASE}/chat/messages`, () => HttpResponse.json({ id: 'm' }, { status: 201 })));
    renderUi(<AdminAnnouncementsPage />);
    await screen.findByText(/3 people/);
    await user.type(screen.getByLabelText('Message'), 'Hi');
    await user.click(screen.getByRole('button', { name: /review and send/i }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Send now' }));
    await screen.findByText('Sent to 3 people.');
    expect(screen.getByRole('region', { name: /also send by email/i })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderUi(<AdminAnnouncementsPage />);
    await screen.findByText(/3 people/);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Message button on a user page', () => {
  function renderDetail(id) {
    return renderUi(
      <Routes>
        <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
      </Routes>,
      `/admin/users/${id}`
    );
  }

  it('opens a direct conversation with that person', async () => {
    server.use(http.get(`${BASE}/users/admin/u-2`, () => HttpResponse.json(ANN)));
    renderDetail('u-2');
    expect(await screen.findByRole('link', { name: 'Message' })).toHaveAttribute('href', '/messages/user/u-2');
  });

  it("isn't offered on the administrator's own account (you can't message yourself)", async () => {
    server.use(http.get(`${BASE}/users/admin/me-1`, () => HttpResponse.json(ME)));
    renderDetail('me-1');
    await screen.findByRole('heading', { name: 'Felix Admin' });
    expect(screen.queryByRole('link', { name: 'Message' })).not.toBeInTheDocument();
  });
});
