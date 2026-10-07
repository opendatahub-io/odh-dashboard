import React from 'react';
import { AccessibleStep } from './accessibleSteps';
import { PipelineStepButton } from './stepLabels';

type PipelineStepListProps = {
  steps: AccessibleStep[];
  headingId: string;
  headingText: string;
  onStepSelect: (id: string) => void;
  className?: string;
};

const PipelineStepList: React.FC<PipelineStepListProps> = ({
  steps,
  headingId,
  headingText,
  onStepSelect,
  className,
}) => {
  if (steps.length === 0) {
    return null;
  }

  return (
    <>
      <h3 id={headingId} className="visually-hidden">
        {headingText}
      </h3>
      <ol className={className ?? 'pipeline-run-steps-list'} aria-labelledby={headingId}>
        {steps.map((step) => (
          <li key={step.id} className="pipeline-run-steps-list__item">
            <PipelineStepButton step={step} onSelect={onStepSelect} />
          </li>
        ))}
      </ol>
    </>
  );
};

export default PipelineStepList;
