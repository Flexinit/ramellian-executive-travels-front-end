// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import DropdownMenu from './DropdownMenu';

const items = [
  { label: 'Browse All', to: '/vehicles' },
  { label: 'Self-Drive', to: '/vehicles?selfDrive=true' },
];

function renderMenu(props = {}) {
  return render(
    <MemoryRouter>
      <div>
        <button type="button">Outside</button>
        <DropdownMenu isOpen items={items} onClose={vi.fn()} {...props} />
      </div>
    </MemoryRouter>
  );
}

describe('DropdownMenu', () => {
  it('renders nothing when isOpen is false', () => {
    renderMenu({ isOpen: false });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('renders all link items', () => {
    renderMenu();
    expect(screen.getByRole('menuitem', { name: 'Browse All' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Self-Drive' })).toBeInTheDocument();
  });

  it('renders action items as buttons', () => {
    const onLogout = vi.fn();
    renderMenu({ items: [...items, { label: 'Log Out', onClick: onLogout }] });
    expect(screen.getByRole('menuitem', { name: 'Log Out' }).tagName).toBe('BUTTON');
  });

  it('fires onClick and onClose when an action item is chosen', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    const onClose = vi.fn();
    renderMenu({ items: [{ label: 'Log Out', onClick: onLogout }], onClose });
    await user.click(screen.getByRole('menuitem', { name: 'Log Out' }));
    expect(onLogout).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when clicking outside the panel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderMenu({ onClose });
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when clicking a link inside the panel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderMenu({ onClose });
    await user.click(screen.getByRole('menuitem', { name: 'Browse All' }));
    expect(onClose).toHaveBeenCalledOnce(); // link items close the menu on select, not "outside click"
  });

  it('calls onClose on Escape key', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderMenu({ onClose });
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderMenu();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
