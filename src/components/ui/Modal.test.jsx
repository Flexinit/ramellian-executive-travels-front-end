// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import Modal from './Modal';

describe('Modal', () => {
  it('renders nothing when isOpen=false', () => {
    render(<Modal isOpen={false} onClose={vi.fn()} title="Test Modal">Content</Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when isOpen=true', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} title="Test Modal">Content</Modal>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders the title', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} title="Booking Details">Content</Modal>);
    expect(screen.getByText(/booking details/i)).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Modal">
        <p>Modal body content</p>
      </Modal>
    );
    expect(screen.getByText(/modal body content/i)).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal isOpen={true} onClose={onClose} title="Modal">Content</Modal>);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal isOpen={true} onClose={onClose} title="Modal">Content</Modal>);
    await user.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not close when clicking inside the dialog panel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal isOpen={true} onClose={onClose} title="Modal">Content</Modal>);
    await user.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('has no accessibility violations when open', async () => {
    const { container } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Accessible Modal">Content</Modal>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Modal — tall content', () => {
  it('scrolls inside the screen instead of running off it', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Tall">
        <div style={{ height: 4000 }}>lots of content</div>
      </Modal>
    );
    const panel = screen.getByRole('dialog');
    expect(panel.className).toMatch(/max-h-\[calc\(100dvh-2rem\)\]/);
    const body = screen.getByText('lots of content').parentElement;
    expect(body.className).toMatch(/overflow-y-auto/);
    // the title and Close stay outside the scrolling part
    expect(body.contains(screen.getByRole('button', { name: 'Close' }))).toBe(false);
    expect(body.contains(screen.getByRole('heading', { name: 'Tall' }))).toBe(false);
  });
});
