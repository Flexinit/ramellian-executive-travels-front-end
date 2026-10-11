// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from './Badge';

describe('Badge', () => {
  it('renders the label text', () => {
    render(<Badge label="Confirmed" />);
    expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
  });

  it('applies success variant classes', () => {
    const { container } = render(<Badge label="Active" variant="success" />);
    expect(container.firstChild).toHaveClass('bg-green-500/15');
  });

  it('applies warning variant classes', () => {
    const { container } = render(<Badge label="Pending" variant="warning" />);
    expect(container.firstChild).toHaveClass('bg-yellow-500/15');
  });

  it('applies danger variant classes', () => {
    const { container } = render(<Badge label="Cancelled" variant="danger" />);
    expect(container.firstChild).toHaveClass('bg-red-500/15');
  });

  it('applies info variant classes', () => {
    const { container } = render(<Badge label="Info" variant="info" />);
    expect(container.firstChild).toHaveClass('bg-blue-500/15');
  });

  it('applies neutral variant by default', () => {
    const { container } = render(<Badge label="Unknown" />);
    expect(container.firstChild).toHaveClass('bg-brand-grey/15');
  });
});
