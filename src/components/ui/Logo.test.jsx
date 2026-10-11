// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Logo from './Logo';

describe('Logo', () => {
  it('renders an image element', () => {
    render(<Logo />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('has descriptive alt text', () => {
    render(<Logo />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Ramellian Executive Travels');
  });

  it('renders text fallback alongside the image', () => {
    render(<Logo />);
    expect(screen.getByText(/ramellian/i)).toBeInTheDocument();
  });

  it('applies sm size class', () => {
    const { container } = render(<Logo size="sm" />);
    expect(container.firstChild).toHaveClass('h-8');
  });

  it('applies lg size class', () => {
    const { container } = render(<Logo size="lg" />);
    expect(container.firstChild).toHaveClass('h-16');
  });
});
