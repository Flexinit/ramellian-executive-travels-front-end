// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import StepIndicator from './StepIndicator';

const steps = [
  { label: 'Vehicle' },
  { label: 'Trip Details' },
  { label: 'Review' },
];

describe('StepIndicator', () => {
  it('renders all step labels', () => {
    render(<StepIndicator steps={steps} currentStep={0} />);
    expect(screen.getByText(/vehicle/i)).toBeInTheDocument();
    expect(screen.getByText(/trip details/i)).toBeInTheDocument();
    expect(screen.getByText(/review/i)).toBeInTheDocument();
  });

  it('marks the current step as active', () => {
    render(<StepIndicator steps={steps} currentStep={1} />);
    const activeBubbles = document.querySelectorAll('[aria-current="step"]');
    expect(activeBubbles).toHaveLength(1);
  });

  it('marks completed steps', () => {
    render(<StepIndicator steps={steps} currentStep={2} />);
    // Steps 0 and 1 are complete when currentStep is 2
    const completedSteps = screen.getAllByTestId('step-complete');
    expect(completedSteps).toHaveLength(2);
  });

  it('does not mark future steps as complete', () => {
    render(<StepIndicator steps={steps} currentStep={0} />);
    expect(screen.queryAllByTestId('step-complete')).toHaveLength(0);
  });

  it('lets a flow mark steps done out of order', () => {
    render(<StepIndicator steps={[{ label: 'A', done: true }, { label: 'B' }, { label: 'C', done: true }]} currentStep={1} />);
    expect(screen.getAllByTestId('step-complete')).toHaveLength(2);
  });

  it('makes each step a button when steps are clickable, and reports which one was chosen', async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();
    render(<StepIndicator steps={steps} currentStep={0} onStepClick={onStepClick} />);
    await user.click(screen.getByRole('button', { name: /review/i }));
    expect(onStepClick).toHaveBeenCalledWith(2);
  });

  it('has no buttons when steps are not clickable', () => {
    render(<StepIndicator steps={steps} currentStep={0} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<StepIndicator steps={steps} currentStep={1} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
