// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Divider from './Divider';

describe('Divider', () => {
  it('renders a separator element', () => {
    const { container } = render(<Divider />);
    expect(container.querySelector('[role="separator"]') || container.querySelector('hr')).not.toBeNull();
  });

  it('renders label text when label prop is provided', () => {
    render(<Divider label="OR" />);
    expect(screen.getByText(/^or$/i)).toBeInTheDocument();
  });

  it('does not render label text when label prop is absent', () => {
    render(<Divider />);
    expect(screen.queryByText(/or/i)).not.toBeInTheDocument();
  });
});
