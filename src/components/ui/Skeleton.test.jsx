// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Skeleton from './Skeleton';

describe('Skeleton', () => {
  it('renders with aria-hidden=true', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies rounded class when rounded=true', () => {
    const { container } = render(<Skeleton rounded />);
    expect(container.firstChild).toHaveClass('rounded-full');
  });

  it('applies default rounded-md when rounded is not set', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('rounded-md');
  });

  it('accepts className override', () => {
    const { container } = render(<Skeleton className="w-32 h-8" />);
    expect(container.firstChild).toHaveClass('w-32', 'h-8');
  });

  it('has the animate-pulse class for shimmer effect', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });
});
