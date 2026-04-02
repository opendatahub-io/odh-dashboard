import * as React from 'react';
import { Icon, Label, Popover, Stack, StackItem } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  PausedIcon,
  PendingIcon,
  StopCircleIcon,
} from '@patternfly/react-icons';
import { EvaluationJobState } from '~/app/types';

type StatusConfig = {
  label: string;
  color: React.ComponentProps<typeof Label>['color'];
  icon: React.ReactNode;
};

const statusMap: Record<EvaluationJobState, StatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'grey',
    icon: <PendingIcon />,
  },
  running: {
    label: 'In progress',
    color: 'blue',
    icon: <InProgressIcon />,
  },
  completed: {
    label: 'Completed',
    color: 'green',
    icon: <CheckCircleIcon />,
  },
  failed: {
    label: 'Failed',
    color: 'red',
    icon: <ExclamationCircleIcon />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'grey',
    icon: <StopCircleIcon />,
  },
  stopping: {
    label: 'Stopping',
    color: 'blue',
    icon: <PausedIcon />,
  },
  stopped: {
    label: 'Stopped',
    color: 'grey',
    icon: <StopCircleIcon />,
  },
};

type EvaluationStatusLabelProps = {
  state: EvaluationJobState;
  message?: string;
};

const EvaluationStatusLabel: React.FC<EvaluationStatusLabelProps> = ({ state, message }) => {
  const config = statusMap[state];
  const hasPopover = state === 'failed' && !!message;

  const label = (
    <Label
      color={config.color}
      icon={<Icon isInline>{config.icon}</Icon>}
      data-testid={`status-label-${state}`}
      {...(hasPopover
        ? {
            onClick: () => {
              /* intentional no-op - Click event is handled by the Popover parent,
              this prop enables clickable styles in the PatternFly Label */
            },
          }
        : {})}
    >
      {config.label}
    </Label>
  );

  if (!hasPopover) {
    return label;
  }

  const lines = message.split('\n').filter(Boolean);

  return (
    <Popover
      headerContent="Evaluation failed"
      alertSeverityVariant="danger"
      headerIcon={<ExclamationCircleIcon />}
      data-testid="evaluation-status-popover"
      bodyContent={
        <Stack hasGutter>
          {lines.map((line, index) => (
            <StackItem key={`message-${index}`}>{line}</StackItem>
          ))}
        </Stack>
      }
    >
      {label}
    </Popover>
  );
};

export default EvaluationStatusLabel;
