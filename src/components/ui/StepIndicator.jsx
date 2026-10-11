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
 * Booking / wizard step progress indicator.
 * Matches otto.rentals' inline step counter style.
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
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                    ${isComplete
                      ? 'bg-brand-gold border-brand-gold text-brand-dark'
                      : isCurrent
                      ? 'border-brand-gold text-brand-gold bg-transparent'
                      : 'border-white/20 text-brand-grey bg-transparent'}`}
                >
                  {isComplete ? (
                    <span data-testid="step-complete">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={`text-xs font-medium truncate max-w-[80px] text-center
                    ${isCurrent ? 'text-brand-white' : isComplete ? 'text-brand-gold' : 'text-brand-grey'}`}
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
                    className={`h-0.5 mx-2 mb-5 transition-all
                      ${isComplete ? 'bg-brand-gold' : 'bg-white/10'}`}
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
