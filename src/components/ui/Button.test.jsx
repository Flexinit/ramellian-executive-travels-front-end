// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import Button from './Button';

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Book Now</Button>);
    expect(screen.getByRole('button', { name: /book now/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Disabled</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows a loading spinner and is disabled when loading=true', () => {
    render(<Button loading>Loading</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('is the design system charcoal pill by default', () => {
    render(<Button>Book Now</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('rounded-full', 'bg-accent', 'text-on-accent');
  });

  it('renders a white outlined pill for a quieter action', () => {
    render(<Button variant="outline">Later</Button>);
    expect(screen.getByRole('button')).toHaveClass('rounded-full', 'border-line', 'bg-surface', 'text-ink');
  });

  it('is semibold text-sm at the usual size', () => {
    render(<Button>Rent a Car</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-sm', 'font-semibold', 'px-5', 'py-2.5');
  });

  it('renders a red outline for destructive actions', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('border-red-500', 'text-red-600', 'rounded-full');
  });

  it('renders a white pill for use on a dark surface', () => {
    render(<Button variant="dark">On dark</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-on-accent', 'text-accent');
  });

  it('renders the extra-small car-card pill', () => {
    render(<Button size="xs">Book now</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-[11px]', 'rounded-full');
  });

  it('renders small size', () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-sm');
  });

  it('renders large size', () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-base');
  });

  it('renders a round icon-only size', () => {
    render(<Button size="icon" aria-label="Search">i</Button>);
    expect(screen.getByRole('button', { name: 'Search' })).toHaveClass('h-12', 'rounded-full');
  });

  it('renders a router link with the same look when given `to`', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <MemoryRouter>
        <Button to="/vehicles" onClick={onClick}>
          Rent a Car
        </Button>
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: 'Rent a Car' });
    expect(link).toHaveAttribute('href', '/vehicles');
    expect(link).toHaveClass('rounded-full', 'bg-accent');
    await user.click(link);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders a plain external link when given `href`', () => {
    render(<Button href="https://example.com">Out</Button>);
    expect(screen.getByRole('link', { name: 'Out' })).toHaveAttribute('href', 'https://example.com');
  });

  it('marks a disabled link as aria-disabled', () => {
    render(
      <MemoryRouter>
        <Button to="/x" disabled>
          Nope
        </Button>
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Nope' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('uses type="button" by default', () => {
    render(<Button>Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('accepts type="submit"', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Button>Accessible</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
