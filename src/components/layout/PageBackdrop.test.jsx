// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageBackdrop from './PageBackdrop';

const PHOTOS = ['a.jpg', 'b.jpg', 'c.jpg'];
const shown = () => screen.getByTestId('page-backdrop').style.backgroundImage;

beforeEach(() => window.localStorage.clear());

describe('PageBackdrop', () => {
  it('shows a single photo when given one', () => {
    render(<PageBackdrop image="only.jpg">content</PageBackdrop>);
    expect(shown()).toContain('only.jpg');
  });

  it('shows the next photo on each visit, and goes back to the first after the last', () => {
    const visit = () => {
      const { unmount } = render(<PageBackdrop images={PHOTOS}>content</PageBackdrop>);
      const photo = shown();
      unmount();
      return photo;
    };
    expect(visit()).toContain('a.jpg');
    expect(visit()).toContain('b.jpg');
    expect(visit()).toContain('c.jpg');
    expect(visit()).toContain('a.jpg');
  });

  it('keeps the same photo for as long as the page stays open', () => {
    const { rerender } = render(<PageBackdrop images={PHOTOS}>one</PageBackdrop>);
    const first = shown();
    rerender(<PageBackdrop images={PHOTOS}>two</PageBackdrop>);
    expect(shown()).toBe(first);
  });
});
