// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import NavLink from './NavLink';

function renderWithRouter(ui, { route = '/' } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

const dropdown = [
  { label: 'Browse All', to: '/vehicles' },
  { label: 'Self-Drive', to: '/vehicles?selfDrive=true' },
];

describe('NavLink', () => {
  it('renders as a Link when no dropdown is provided', () => {
    renderWithRouter(<NavLink to="/about" label="About" />);
    const link = screen.getByRole('link', { name: 'About' });
    expect(link).toHaveAttribute('href', '/about');
  });

  it('renders as a button with a closed panel when dropdown items are provided', () => {
    renderWithRouter(<NavLink to="/vehicles" label="Vehicles" dropdown={dropdown} />);
    const trigger = screen.getByRole('button', { name: /vehicles/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the dropdown panel on click', async () => {
    const user = userEvent.setup();
    renderWithRouter(<NavLink to="/vehicles" label="Vehicles" dropdown={dropdown} />);
    await user.click(screen.getByRole('button', { name: /vehicles/i }));
    expect(screen.getByRole('button', { name: /vehicles/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: 'Browse All' })).toBeInTheDocument();
  });

  it('applies active styling when the route matches', () => {
    renderWithRouter(<NavLink to="/vehicles" label="Vehicles" />, { route: '/vehicles' });
    expect(screen.getByRole('link', { name: 'Vehicles' })).toHaveClass('text-brand-gold');
  });

  it('treats sub-routes as active too', () => {
    renderWithRouter(<NavLink to="/vehicles" label="Vehicles" />, { route: '/vehicles/v123' });
    expect(screen.getByRole('link', { name: 'Vehicles' })).toHaveClass('text-brand-gold');
  });

  it('does not apply active styling when the route does not match', () => {
    renderWithRouter(<NavLink to="/vehicles" label="Vehicles" />, { route: '/about' });
    expect(screen.getByRole('link', { name: 'Vehicles' })).not.toHaveClass('text-brand-gold');
  });

  it('only matches "/" exactly, not every route', () => {
    renderWithRouter(<NavLink to="/" label="Home" />, { route: '/vehicles' });
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveClass('text-brand-gold');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithRouter(<NavLink to="/about" label="About" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
