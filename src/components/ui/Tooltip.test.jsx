// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tooltip from './Tooltip';

describe('Tooltip', () => {
  it('renders children', () => {
    render(<Tooltip content="Helpful hint"><button>Hover me</button></Tooltip>);
    expect(screen.getByRole('button', { name: /hover me/i })).toBeInTheDocument();
  });

  it('tooltip content is hidden by default', () => {
    render(<Tooltip content="Helpful hint"><button>Hover me</button></Tooltip>);
    expect(screen.queryByText(/helpful hint/i)).not.toBeVisible();
  });

  it('shows tooltip content on hover', async () => {
    const user = userEvent.setup();
    render(<Tooltip content="Helpful hint"><button>Hover me</button></Tooltip>);
    await user.hover(screen.getByRole('button'));
    expect(screen.getByText(/helpful hint/i)).toBeVisible();
  });

  it('hides tooltip content on unhover', async () => {
    const user = userEvent.setup();
    render(<Tooltip content="Helpful hint"><button>Hover me</button></Tooltip>);
    await user.hover(screen.getByRole('button'));
    await user.unhover(screen.getByRole('button'));
    expect(screen.queryByText(/helpful hint/i)).not.toBeVisible();
  });

  it('trigger element has aria-describedby linking to tooltip', () => {
    render(<Tooltip content="Helpful hint"><button>Hover me</button></Tooltip>);
    const trigger = screen.getByRole('button');
    const tooltipId = trigger.getAttribute('aria-describedby');
    expect(tooltipId).toBeTruthy();
    expect(document.getElementById(tooltipId)).toBeInTheDocument();
  });
});
