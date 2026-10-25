import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { DetailList, DetailRow } from './DetailList';

describe('DetailList', () => {
  it('renders a description list of labels and values, values left-aligned in their own column', () => {
    const { container } = render(
      <DetailList>
        <DetailRow label="Dates">17 Oct 2026</DetailRow>
        <DetailRow label="Pickup Location">Eastleigh</DetailRow>
      </DetailList>
    );
    const dl = container.querySelector('dl');
    expect(dl).toHaveClass('grid', 'grid-cols-[minmax(0,max-content)_minmax(0,1fr)]');
    expect(screen.getByText('Dates').tagName).toBe('DT');
    const value = screen.getByText('Eastleigh');
    expect(value.tagName).toBe('DD');
    expect(value).toHaveClass('text-left');
    expect(value).not.toHaveClass('text-right');
    // A table: each pair is a row, the rows alternating white and light grey.
    // From sm up the pair sits side by side in the shared columns; on a phone the label goes above the value.
    expect(value.parentElement).toHaveClass('odd:bg-surface', 'even:bg-subtle', 'flex-col', 'sm:grid-cols-subgrid');
  });

  it('keeps label and value side by side on phones too when inline (price lines)', () => {
    render(
      <DetailList inline>
        <DetailRow label="2 days × KES 1">KES 2</DetailRow>
      </DetailList>
    );
    const row = screen.getByText('KES 2').parentElement;
    expect(row).toHaveClass('grid-cols-subgrid');
    expect(row).not.toHaveClass('flex-col');
  });

  it('stacks a free-text value under its label across the full width', () => {
    render(
      <DetailList>
        <DetailRow label="Notes" stacked>Please call on arrival</DetailRow>
      </DetailList>
    );
    expect(screen.getByText('Notes').parentElement).toHaveClass('col-span-full');
  });

  it('leaves out a hidden row', () => {
    render(
      <DetailList>
        <DetailRow label="Route" hidden>A → B</DetailRow>
      </DetailList>
    );
    expect(screen.queryByText('Route')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <DetailList>
        <DetailRow label="Dates">17 Oct 2026</DetailRow>
        <DetailRow label="Notes" stacked>Call on arrival</DetailRow>
      </DetailList>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
