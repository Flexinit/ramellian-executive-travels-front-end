// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Avatar from './Avatar';

describe('Avatar', () => {
  it('renders initials when no src is provided', () => {
    render(<Avatar name="John Kamau" />);
    expect(screen.getByText('JK')).toBeInTheDocument();
  });

  it('renders single initial for single-word name', () => {
    render(<Avatar name="Alice" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders an image when src is provided', () => {
    render(<Avatar name="John Kamau" src="https://example.com/photo.jpg" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('image has alt text derived from name', () => {
    render(<Avatar name="John Kamau" src="https://example.com/photo.jpg" />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'John Kamau');
  });

  it('applies md size by default', () => {
    const { container } = render(<Avatar name="Test" />);
    expect(container.firstChild).toHaveClass('w-9');
  });

  it('applies sm size class', () => {
    const { container } = render(<Avatar name="Test" size="sm" />);
    expect(container.firstChild).toHaveClass('w-7');
  });

  it('applies lg size class', () => {
    const { container } = render(<Avatar name="Test" size="lg" />);
    expect(container.firstChild).toHaveClass('w-12');
  });

  it('applies xl size class', () => {
    const { container } = render(<Avatar name="Test" size="xl" />);
    expect(container.firstChild).toHaveClass('w-20');
  });
});
