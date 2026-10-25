// @vitest-environment jsdom
import React, { useRef } from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import FloatingActionBar from './FloatingActionBar';
import { useUiStore } from '../../store/uiStore';

let observed;
beforeEach(() => {
  observed = null;
  window.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; }
    observe(el) { observed = { cb: this.cb, el }; }
    disconnect() {}
  };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
});
afterEach(() => {
  delete window.IntersectionObserver;
  act(() => useUiStore.setState({ actionBarVisible: false }));
});

function Page() {
  const ref = useRef(null);
  return (
    <>
      <div ref={ref}><button type="button">Book now (in page)</button></div>
      <FloatingActionBar watch={ref} summary={<span>KES 2</span>} label="Book this vehicle">
        <button type="button">Book now</button>
      </FloatingActionBar>
    </>
  );
}

/** Reports where the page's own buttons are: below the screen, on it, or scrolled past. */
const report = (where) =>
  act(() => observed.cb([{ isIntersecting: where === 'visible', boundingClientRect: { top: where === 'below' ? 900 : -400 } }]));

describe('FloatingActionBar', () => {
  it("floats the page's main action while its own buttons are still further down", () => {
    render(<Page />);
    report('below');
    const bar = screen.getByRole('region', { name: 'Book this vehicle' });
    expect(bar).toHaveTextContent('KES 2');
    expect(bar).toHaveTextContent('Book now');
    expect(bar.className).toContain('lg:hidden');
    expect(useUiStore.getState().actionBarVisible).toBe(true);
  });

  it("steps aside once the page's own buttons are on screen — or have been scrolled past", () => {
    render(<Page />);
    report('below');
    report('visible');
    expect(screen.queryByRole('region', { name: 'Book this vehicle' })).not.toBeInTheDocument();
    expect(useUiStore.getState().actionBarVisible).toBe(false);
    report('above');
    expect(screen.queryByRole('region', { name: 'Book this vehicle' })).not.toBeInTheDocument();
  });
});
