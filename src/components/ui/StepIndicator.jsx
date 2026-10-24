import React from 'react';
import { Check } from 'lucide-react';

/** The bubble + label — a button when steps are clickable, otherwise a plain box. */
function Wrapper({ index, onStepClick, children }) {
  const className = 'flex flex-col items-center gap-1.5 min-w-0';
  if (!onStepClick) return <div className={className}>{children}</div>;
  return (
    <button
      type="button"
      onClick={() => onStepClick(index)}
      className={`${className} rounded-lg focus-ring hover:opacity-80 transition-opacity`}
    >
      {children}
    </button>
  );
}

/**
 * Booking / wizard step progress indicator — the design system's step bar ("Booking details • Payment methods •
 * confirmation"): small dots on a thin line with the step names underneath. A finished step is a solid navy dot with a
 * white check, the current one a white dot with a thick navy ring around a navy centre, the ones still to come a faded
 * navy dot; the line between two steps is solid once the first of them is done.
 *
 * @param {{ label: string, done?: boolean }[]} steps — `done` overrides the default
 *   "every step before the current one is complete" when a flow can be done out of order
 * @param {number} currentStep — 0-indexed
 * @param {(index: number) => void} [onStepClick] — makes each step a button, so a
 *   person can jump to (or back to) any step
 */
export default function StepIndicator({ steps = [], currentStep = 0, onStepClick }) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center justify-between gap-0" role="list">
        {steps.map((step, index) => {
          const isComplete = step.done ?? index < currentStep;
          const isCurrent  = index === currentStep;

          return (
            <React.Fragment key={step.label}>
              {/* Step bubble + label */}
              <li className="flex flex-col items-center gap-1.5 min-w-0 list-none">
                <Wrapper index={index} onStepClick={onStepClick}>
                <div
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all
                    ${isComplete
                      ? 'bg-accent text-on-accent'
                      : isCurrent
                      ? 'bg-surface border-[5px] border-accent'
                      : 'bg-accent/30'}`}
                >
                  {isComplete ? (
                    <span data-testid="step-complete">
                      <Check size={11} strokeWidth={3.5} />
                    </span>
                  ) : null}
                </div>
                <span
                  className={`text-[11px] truncate max-w-[96px] text-center
                    ${isCurrent ? 'text-ink font-semibold' : 'text-muted font-medium'}`}
                >
                  {step.label}
                </span>
                </Wrapper>
              </li>

              {/* Connector line rendered as a presentational list item */}
              {index < steps.length - 1 && (
                <li
                  aria-hidden="true"
                  className="flex-1 list-none"
                >
                  <div
                    className={`h-px mx-1 mb-6 transition-all
                      ${isComplete ? 'bg-accent' : 'bg-accent/30'}`}
                  />
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
