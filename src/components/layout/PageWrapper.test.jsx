// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageWrapper from './PageWrapper';

describe('PageWrapper', () => {
  it('wraps children in a <main> element', () => {
    render(
      <PageWrapper>
        <p>Hello</p>
      </PageWrapper>
    );
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveTextContent('Hello');
  });

  it('applies responsive padding classes', () => {
    render(
      <PageWrapper>
        <p>Hello</p>
      </PageWrapper>
    );
    const main = screen.getByRole('main');
    expect(main.className).toMatch(/px-4/);
    expect(main.className).toMatch(/sm:px-6/);
    expect(main.className).toMatch(/lg:px-8/);
  });

  it('merges a custom className', () => {
    render(
      <PageWrapper className="bg-red-500">
        <p>Hi</p>
      </PageWrapper>
    );
    expect(screen.getByRole('main')).toHaveClass('bg-red-500');
  });
});
