// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import Navbar from './Navbar';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';

afterEach(() => {
  useAuthStore.setState({ token: null, user: null });
  useUiStore.setState({ mobileMenuOpen: false });
});

function renderNavbar(route = '/') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[route]}>
        <Navbar />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Navbar', () => {
  it('renders the Ramellian logo', () => {
    renderNavbar();
    expect(screen.getByText('RAMELLIAN')).toBeInTheDocument();
  });

  it('has only About, Terms & Conditions, Privacy Policy and Contact as primary links — no Vehicles or Services menus', () => {
    renderNavbar();
    const primary = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(primary).getAllByRole('link').map((l) => l.textContent)).toEqual(['About', 'Terms & Conditions', 'Privacy Policy', 'Contact']);
    expect(screen.queryByRole('button', { name: /^vehicles/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^services/i })).not.toBeInTheDocument();
  });

  it('has the logo top left, and About and Contact at the far right end, after the buttons', () => {
    renderNavbar();
    const logo = screen.getByText('RAMELLIAN');
    const rentACar = screen.getByRole('link', { name: /rent a car/i });
    const rentOut = screen.getByRole('link', { name: /list your car/i });
    const about = screen.getByRole('link', { name: 'About' });
    const contact = screen.getByRole('link', { name: 'Contact' });
    const follows = (a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    expect(follows(logo, rentACar)).toBe(true);
    expect(follows(rentOut, about)).toBe(true);
    expect(follows(about, contact)).toBe(true);
    // The logo is on its own at the left; everything else shares the right-hand group.
    const rightGroup = about.closest('div.ml-auto');
    expect(rightGroup).toContainElement(rentACar);
    expect(rightGroup).toContainElement(contact);
    expect(rightGroup).not.toContainElement(logo);
  });

  it('signed in, the logo fills the left menu column so it sits exactly at the top of the menu', () => {
    act(() => {
      useAuthStore.setState({ token: 'abc', user: { id: '1', email: 'j@x.com', roles: ['RENTER'] } });
    });
    renderNavbar();
    const logoLink = screen.getByText('RAMELLIAN').closest('a');
    expect(logoLink).toHaveClass('md:w-64', 'md:pl-5', 'md:bg-brand-navy');
    // The bar runs the full width, so the column lines up with the menu at the page edge.
    expect(logoLink.parentElement).toHaveClass('w-full');
  });

  it('for a visitor (no menu) keeps the logo in the centred, padded container', () => {
    renderNavbar();
    const logoLink = screen.getByText('RAMELLIAN').closest('a');
    expect(logoLink).not.toHaveClass('md:w-64');
    expect(logoLink.parentElement).toHaveClass('site-width');
  });

  it('always shows the logo, even on a page with the left menu', () => {
    renderNavbar('/dashboard');
    expect(screen.getByText('RAMELLIAN').closest('a')).not.toHaveClass('md:hidden');
    expect(screen.getByText('RAMELLIAN').closest('a')).toHaveAttribute('href', '/');
  });

  it('puts the notification bell and then the account avatar at the far end when signed in', () => {
    act(() => {
      useAuthStore.setState({ token: 'abc', user: { id: '1', email: 'j@x.com', roles: ['RENTER'] } });
    });
    renderNavbar();
    const bell = screen.getAllByRole('link', { name: /^inbox/i })[0];
    const avatar = screen.getByRole('button', { name: /account menu/i });
    expect(bell).toHaveAttribute('href', '/inbox');
    expect(bell.compareDocumentPosition(avatar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows Log In, Rent a Car and List Your Car when unauthenticated — Log In is always in the bar, on phones too', () => {
    renderNavbar();
    const logIns = screen.getAllByRole('link', { name: /^log in$/i });
    expect(logIns).toHaveLength(2); // the desktop button and the phone one beside the hamburger
    logIns.forEach((link) => expect(link).toHaveAttribute('href', '/auth/login'));
    expect(screen.getByRole('link', { name: /rent a car/i })).toHaveAttribute('href', '/vehicles');
    expect(screen.getByRole('link', { name: /list your car/i })).toHaveAttribute('href', '/auth/register?as=owner');
  });

  it('puts Log In after Rent a Car and List Your Car', () => {
    renderNavbar();
    const rentOut = screen.getByRole('link', { name: /list your car/i });
    const rent = screen.getByRole('link', { name: /rent a car/i });
    // The desktop Log In is the one sharing a row with the Rent buttons.
    const logIn = screen.getAllByRole('link', { name: /^log in$/i }).find((l) => l.parentElement === rentOut.parentElement);
    expect(rent.compareDocumentPosition(rentOut) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(rentOut.compareDocumentPosition(logIn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('once signed in, no longer shows Rent a Car or List Your Car', () => {
    act(() => {
      useAuthStore.setState({
        token: 'abc',
        user: { id: '1', name: 'John Kamau', email: 'j@x.com', role: 'RENTER' },
      });
    });
    renderNavbar();
    expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /rent a car/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /list your car/i })).not.toBeInTheDocument();
  });

  it('shows no bell to a visitor', () => {
    renderNavbar();
    expect(screen.queryByRole('link', { name: /^inbox/i })).not.toBeInTheDocument();
  });

  it('renders the mobile menu toggle', () => {
    renderNavbar();
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderNavbar();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
