// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TripTypeIcon, { TripTypeLabel } from './TripTypeIcon';
import { TRIP_TYPES } from '../../lib/constants';

describe('TripTypeIcon', () => {
  it('gives every trip type its own icon', () => {
    const drawings = Object.values(TRIP_TYPES).map((type) => {
      const { container, unmount } = render(<TripTypeIcon type={type} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      const html = svg.innerHTML;
      unmount();
      return html;
    });
    expect(new Set(drawings).size).toBe(drawings.length);
  });

  it('falls back to the General icon for a type it does not know', () => {
    const general = render(<TripTypeIcon type={TRIP_TYPES.GENERAL} />).container.querySelector('svg').innerHTML;
    const unknown = render(<TripTypeIcon type="SOMETHING_NEW" />).container.querySelector('svg').innerHTML;
    expect(unknown).toBe(general);
  });
});

describe('TripTypeLabel', () => {
  it('shows the icon beside the label', () => {
    const { container } = render(<TripTypeLabel type={TRIP_TYPES.AIRPORT_TRANSFER} />);
    expect(screen.getByText('Airport Transfer')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('tidies an unknown code into a label', () => {
    render(<TripTypeLabel type="NIGHT_OUT" />);
    expect(screen.getByText('Night out')).toBeInTheDocument();
  });
});
