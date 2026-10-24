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
