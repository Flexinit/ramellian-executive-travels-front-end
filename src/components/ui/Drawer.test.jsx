// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import Drawer from './Drawer';

/** A stateful host, since `Drawer` is fully controlled — exercises the real open/dismiss/reopen cycle. */
function ControlledDrawer({ startOpen = true }) {
  const [isOpen, setIsOpen] = useState(startOpen);
  return (
    <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} onReopen={() => setIsOpen(true)} title="Drawer">
      Content
    </Drawer>
  );
}

describe('Drawer', () => {
  it('renders nothing when isOpen=false', () => {
    render(<Drawer isOpen={false} onClose={vi.fn()} title="Test Drawer">Content</Drawer>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when isOpen=true', () => {
    render(<Drawer isOpen={true} onClose={vi.fn()} title="Test Drawer">Content</Drawer>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders the title', () => {
    render(<Drawer isOpen={true} onClose={vi.fn()} title="Log In">Content</Drawer>);
    expect(screen.getByText(/log in/i)).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <Drawer isOpen={true} onClose={vi.fn()} title="Drawer">
        <p>Drawer body content</p>
      </Drawer>
    );
    expect(screen.getByText(/drawer body content/i)).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Drawer isOpen={true} onClose={onClose} title="Drawer">Content</Drawer>);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when the overlay is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Drawer isOpen={true} onClose={onClose} title="Drawer">Content</Drawer>);
    await user.click(screen.getByTestId('drawer-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not close when clicking inside the panel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Drawer isOpen={true} onClose={onClose} title="Drawer">Content</Drawer>);
    await user.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('anchors the panel to the right edge, not centered', () => {
    render(<Drawer isOpen={true} onClose={vi.fn()} title="Drawer">Content</Drawer>);
    expect(screen.getByRole('dialog').parentElement.className).toMatch(/justify-end/);
  });

  it('is sized to its content, not stretched the full height of the screen', () => {
    render(<Drawer isOpen={true} onClose={vi.fn()} title="Drawer">Content</Drawer>);
    const classes = screen.getByRole('dialog').className.split(/\s+/);
    expect(classes).toContain('max-h-full');
    expect(classes).not.toContain('h-full');
    expect(classes).toContain('rounded-2xl');
  });

  it('has no accessibility violations when open', async () => {
    const { container } = render(
      <Drawer isOpen={true} onClose={vi.fn()} title="Accessible Drawer">Content</Drawer>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('does not render a restore tab when no onReopen is given', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Drawer isOpen={true} onClose={onClose} title="Drawer">Content</Drawer>);
    await user.click(screen.getByTestId('drawer-backdrop'));
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
  });
});

describe('Drawer — dismiss and restore', () => {
  it('leaves a restore tab, labelled with the drawer\'s own title, after being dismissed by clicking outside, which reopens it', async () => {
    const user = userEvent.setup();
    render(<ControlledDrawer />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByTestId('drawer-backdrop'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const tab = screen.getByRole('button', { name: /continue: drawer/i });

    await user.click(tab);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
  });

  it('leaves a restore tab after the X is clicked', async () => {
    const user = userEvent.setup();
    render(<ControlledDrawer />);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.getByRole('button', { name: /continue: drawer/i })).toBeInTheDocument();
  });

  it('leaves a restore tab after pressing Escape', async () => {
    const user = userEvent.setup();
    render(<ControlledDrawer />);
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: /continue: drawer/i })).toBeInTheDocument();
  });
});
