// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Building2 } from 'lucide-react';
import ServiceCard from './ServiceCard';

describe('ServiceCard', () => {
  it('renders the icon, title, description, and index', () => {
    render(
      <ServiceCard icon={Building2} title="Corporate Transport" description="Reliable daily transport." index="01" />
    );
    expect(screen.getByText('Corporate Transport')).toBeInTheDocument();
    expect(screen.getByText('Reliable daily transport.')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ServiceCard icon={Building2} title="Corporate Transport" description="Reliable daily transport." index="01" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
