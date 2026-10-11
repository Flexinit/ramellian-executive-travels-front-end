import '@testing-library/jest-dom';
import { expect, afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { configureAxe, toHaveNoViolations } from 'jest-axe';
import { server } from '../mocks/server';

// Testing Library's `findBy*` queries default to a 1000ms timeout, which
// React.lazy() route chunks (App.jsx, 12.7) can occasionally miss under the
// heavy parallelism of a full suite run, even though they resolve quickly
// in isolation — bump it well above what a lazy import + render pass needs.
// TEST_ASYNC_TIMEOUT raises it further on slow machines (the Docker test stage on the VPS sets it).
configure({ asyncUtilTimeout: Number(process.env.TEST_ASYNC_TIMEOUT) || 5000 });

// Extend vitest's expect with jest-dom matchers
expect.extend(matchers);

// Extend vitest's expect with jest-axe matchers
expect.extend(toHaveNoViolations);

// Recharts' <ResponsiveContainer> (BookingsChart) measures its container with a ResizeObserver and reads
// its pixel size — neither exists in jsdom (no real layout engine), so every chart would otherwise render
// at 0×0 and show nothing. A fixed nonzero size is enough for charts to actually render their content in
// tests; nothing in the suite depends on these being exactly 0 (jsdom never gave a meaningful value anyway).
class ResizeObserverStub {
  constructor(callback) {
    this.callback = callback;
  }
  observe(target) {
    // Recharts reads the size off the very first callback invocation to decide whether to render at all —
    // firing synchronously (real ResizeObserver callbacks are async, but nothing here depends on the timing)
    // means a chart's content exists in the tree immediately after mount, not only after a later tick.
    this.callback([{ target, contentRect: { width: 800, height: 280 } }]);
  }
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = global.ResizeObserver || ResizeObserverStub;
['offsetWidth', 'offsetHeight', 'clientWidth', 'clientHeight'].forEach((prop) => {
  Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, value: 800 });
});
const realGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
HTMLElement.prototype.getBoundingClientRect = function stubbedGetBoundingClientRect() {
  const real = realGetBoundingClientRect.call(this);
  if (real.width > 0 && real.height > 0) return real;
  return { ...real, width: 800, height: 280, x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 280 };
};

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test (keeps tests isolated)
afterEach(() => {
  cleanup();
  // Drafts, remembered account type, etc. live in localStorage — don't let one test's leak into the next.
  try {
    localStorage.clear();
  } catch {
    /* not a DOM environment */
  }
  server.resetHandlers();
});

// Stop server after all tests
afterAll(() => server.close());
