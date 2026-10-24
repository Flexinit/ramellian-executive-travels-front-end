import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Users, Fuel } from 'lucide-react';
import FeatureTile, { FeatureGrid } from './FeatureTile';

describe('FeatureTile', () => {
  it('shows each feature as a labelled tile in a named list', () => {
    render(
      <FeatureGrid label="Car features">
        <FeatureTile icon={Users} label="Capacity" value="5 Seats" />
        <FeatureTile icon={Fuel} label="Fuel" value="Petrol" />
      </FeatureGrid>
    );
    const list = screen.getByRole('list', { name: 'Car features' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Capacity');
    expect(items[0]).toHaveTextContent('5 Seats');
  });

  it('shows the first few, with a button that shows the rest and folds them away again', async () => {
    const user = userEvent.setup();
    render(
      <FeatureGrid label="Car features" initialCount={2}>
        <FeatureTile icon={Users} label="Capacity" value="5 seats" />
        <FeatureTile icon={Fuel} label="Fuel" value="Petrol" />
        <FeatureTile icon={Fuel} label="Colour" value="Black" />
      </FeatureGrid>
    );
    expect(screen.queryByText('Black')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Show all 3 features' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(screen.getByText('Black')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show fewer' }));
    expect(screen.queryByText('Black')).not.toBeInTheDocument();
  });

  it('has no button when everything already fits', () => {
    render(
      <FeatureGrid label="Car features" initialCount={4}>
        <FeatureTile icon={Users} label="Capacity" value="5 seats" />
      </FeatureGrid>
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <FeatureGrid label="Car features">
        <FeatureTile icon={Users} label="Capacity" value="5 Seats" />
      </FeatureGrid>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
