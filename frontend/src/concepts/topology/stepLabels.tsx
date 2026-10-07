import React from 'react';
import { Label } from '@patternfly/react-core';
import { RunStatus } from '@patternfly/react-topology';
import { AccessibleStep, normalizeRunStatus } from './accessibleSteps';

export const STEP_STATUS_COLOR: Partial<
  Record<RunStatus, React.ComponentProps<typeof Label>['color']>
> = {
  [RunStatus.Failed]: 'red',
  [RunStatus.Cancelled]: 'orange',
  [RunStatus.Running]: 'blue',
  [RunStatus.Pending]: undefined,
  [RunStatus.Skipped]: undefined,
  [RunStatus.Succeeded]: 'green',
};

export const getStepLabelColor = (status: RunStatus): React.ComponentProps<typeof Label>['color'] =>
  STEP_STATUS_COLOR[normalizeRunStatus(status)];

type PipelineStepButtonProps = {
  step: AccessibleStep;
  onSelect: (id: string) => void;
};

export const PipelineStepButton: React.FC<PipelineStepButtonProps> = ({ step, onSelect }) => {
  const isFailure = step.status === RunStatus.Failed || step.status === RunStatus.Cancelled;

  return (
    <Label
      color={getStepLabelColor(step.status)}
      onClick={() => onSelect(step.id)}
      data-testid={`pipeline-step-label-${step.id}`}
      {...(isFailure ? { 'data-failure': true } : {})}
    >
      <span aria-hidden="true">
        {step.label}, {step.statusLabel}
      </span>
      <span className="visually-hidden">
        {step.label}, {step.statusLabel}, view details
      </span>
    </Label>
  );
};
