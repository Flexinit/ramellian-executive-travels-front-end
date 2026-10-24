// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { act } from '@testing-library/react';
import { axe } from 'jest-axe';
import HeroBackgroundSlideshow from './HeroBackgroundSlideshow';

afterEach(() => {
  vi.useRealTimers();
});

describe('HeroBackgroundSlideshow', () => {
  it('renders one image per destination, hidden from assistive tech', () => {
    const { container } = render(<HeroBackgroundSlideshow />);
    const images = container.querySelectorAll('img');
    expect(images.length).toBe(3);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('cross-fades to the next image over time', () => {
    vi.useFakeTimers();
    const { container } = render(<HeroBackgroundSlideshow />);
    const images = container.querySelectorAll('img');
    expect(images[0].className).toContain('opacity-100');

    act(() => {
      vi.advanceTimersByTime(7000);
    });

    expect(images[1].className).toContain('opacity-100');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<HeroBackgroundSlideshow />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
