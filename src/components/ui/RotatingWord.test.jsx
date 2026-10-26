// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import RotatingWord from './RotatingWord';

const WORDS = ['Reimagined', 'Redefined', 'Elevated'];
const realMatchMedia = window.matchMedia;

afterEach(() => {
  vi.useRealTimers();
  window.matchMedia = realMatchMedia;
});

describe('RotatingWord', () => {
  it('starts on the first word, and its text is only the word showing (the width holders write nothing)', () => {
    const { container } = render(<h1>Executive Travel, <RotatingWord words={WORDS} /></h1>);
    expect(container.querySelector('h1').textContent).toBe('Executive Travel, Reimagined');
    expect(container.querySelectorAll('[data-word]')).toHaveLength(3);
  });

  it('moves on to the next word, and round again', () => {
    vi.useFakeTimers();
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    const { container } = render(<h1><RotatingWord words={WORDS} interval={1000} /></h1>);
    act(() => vi.advanceTimersByTime(1000));
    expect(container.textContent).toBe('Redefined');
    act(() => vi.advanceTimersByTime(2000));
    expect(container.textContent).toBe('Reimagined');
  });

  it('stays still when the device asks for reduced motion', () => {
    vi.useFakeTimers();
    window.matchMedia = (q) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} });
    const { container } = render(<h1><RotatingWord words={WORDS} interval={1000} /></h1>);
    act(() => vi.advanceTimersByTime(5000));
    expect(container.textContent).toBe('Reimagined');
  });
});
