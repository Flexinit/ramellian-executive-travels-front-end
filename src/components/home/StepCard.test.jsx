// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import StepCard from './StepCard';

describe('StepCard', () => {
  it('renders the step number, title, and description', () => {
    render(<StepCard number={1} title="Choose Your Vehicle" description="Search by location and date." />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Choose Your Vehicle')).toBeInTheDocument();
    expect(screen.getByText('Search by location and date.')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<StepCard number={1} title="Choose Your Vehicle" description="Search by location and date." />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
