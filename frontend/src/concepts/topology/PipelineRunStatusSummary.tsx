import React from 'react';
import { Label, LabelGroup } from '@patternfly/react-core';
import { RunStatus } from '@patternfly/react-topology';
import { AccessibleStep } from './accessibleSteps';
import { getRunStatusLabel } from './utils';

const DISPLAY_ORDER = [
  RunStatus.Failed,
  RunStatus.Cancelled,
  RunStatus.Running,
  RunStatus.Pending,
  RunStatus.Skipped,
  RunStatus.Succeeded,
] as const;

const STATUS_COLOR: Partial<Record<RunStatus, React.ComponentProps<typeof Label>['color']>> = {
  [RunStatus.Failed]: 'red',
  [RunStatus.Cancelled]: 'orange',
  [RunStatus.Running]: 'blue',
  [RunStatus.Succeeded]: 'green',
};

type PipelineRunStatusSummaryProps = {
  steps: AccessibleStep[];
  onNodeSelect: (id: string) => void;
};

const PipelineRunStatusSummary: React.FC<PipelineRunStatusSummaryProps> = ({
  steps,
  onNodeSelect,
}) => {
  if (steps.length === 0) {
    return null;
  }

  return (
    <div
      className="odh-pipeline-run-status-summary"
      role="region"
      aria-label="Pipeline run step status summary"
    >
      <LabelGroup aria-label="Step statuses" numLabels={steps.length + DISPLAY_ORDER.length}>
        {DISPLAY_ORDER.map((status) => {
          const matchingSteps = steps.filter((step) => step.status === status);
          if (matchingSteps.length === 0) {
            return null;
          }

          const statusLabel =
            status === RunStatus.Succeeded ? 'Succeeded' : getRunStatusLabel(status);
          const color = STATUS_COLOR[status];
          return (
            <React.Fragment key={status}>
              <Label color={color} data-testid={`pipeline-status-count-${status}`}>
                {matchingSteps.length} {statusLabel}
              </Label>
              {(status === RunStatus.Failed || status === RunStatus.Cancelled) &&
                matchingSteps.map((step) => (
                  <Label
                    key={step.id}
                    color={color}
                    onClick={() => onNodeSelect(step.id)}
                    data-testid={`pipeline-status-label-${step.id}`}
                  >
                    {step.label}, {step.statusLabel}
                  </Label>
                ))}
            </React.Fragment>
          );
        })}
      </LabelGroup>
    </div>
  );
};

export default PipelineRunStatusSummary;
