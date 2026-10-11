// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ShieldCheck } from 'lucide-react';
import TrustBadge from './TrustBadge';

describe('TrustBadge', () => {
  it('renders the icon, title, and description', () => {
    render(<TrustBadge icon={ShieldCheck} title="Vetted Chauffeurs" description="Background-checked drivers." />);
    expect(screen.getByText('Vetted Chauffeurs')).toBeInTheDocument();
    expect(screen.getByText('Background-checked drivers.')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<TrustBadge icon={ShieldCheck} title="Vetted Chauffeurs" description="Background-checked drivers." />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
