// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import MobileMenu from './MobileMenu';
import { useUiStore } from '../../store/uiStore';

afterEach(() => {
  useUiStore.setState({ mobileMenuOpen: false });
});

const links = [
  {
    label: 'Vehicles',
    to: '/vehicles',
    dropdown: [{ label: 'Browse All', to: '/vehicles' }],
  },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

function renderMenu() {
  return render(
    <MemoryRouter>
      <MobileMenu links={links} />
    </MemoryRouter>
  );
}

describe('MobileMenu', () => {
  it('renders a hamburger toggle button, closed by default', () => {
    renderMenu();
    const toggle = screen.getByRole('button', { name: /open menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).not.toBeInTheDocument();
  });

  it('opens the drawer when the hamburger is clicked', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeInTheDocument();
  });

  it('closes the drawer when the hamburger is clicked again', async () => {
    const user = userEvent.setup();
    renderMenu();
    const toggle = screen.getByRole('button', { name: /open menu/i });
    await user.click(toggle);
    await user.click(toggle);
    expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).not.toBeInTheDocument();
  });

  it('opens over the whole page (not inside the header) and closes from its own button', async () => {
    const user = userEvent.setup();
    const { container } = renderMenu();
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    const nav = screen.getByRole('navigation', { name: /mobile navigation/i });
    // Rendered into document.body, so the blurred header can't squeeze it into its own 80px strip.
    expect(container.contains(nav)).toBe(false);
    await user.click(within(nav).getByRole('button', { name: /close menu/i }));
    expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).not.toBeInTheDocument();
  });

  it('renders plain links directly', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact' })).toBeInTheDocument();
  });

  it('renders dropdown items as a heading with nested links', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByText('Vehicles')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse All' })).toBeInTheDocument();
  });

  it('closes the drawer when a link is clicked', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    await user.click(screen.getByRole('link', { name: 'About' }));
    expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).not.toBeInTheDocument();
  });

  it('has no accessibility violations when open', async () => {
    const user = userEvent.setup();
    const { container } = renderMenu();
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
