import * as React from 'react';
import { Icon, Label, LabelProps, Popover, Stack, StackItem } from '@patternfly/react-core';
import {
  BanIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  OffIcon,
  PendingIcon,
} from '@patternfly/react-icons';
import { EvaluationJobState } from '~/app/types';

type StatusConfig = {
  label: string;
  color?: LabelProps['color'];
  status?: LabelProps['status'];
  icon: React.ReactNode;
  isFilled?: boolean;
};

const statusMap: Record<EvaluationJobState, StatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'purple',
    icon: <PendingIcon />,
  },
  running: {
    label: 'Running',
    color: 'blue',
    icon: <InProgressIcon />,
  },
  completed: {
    label: 'Complete',
    status: 'success',
    icon: <CheckCircleIcon />,
  },
  failed: {
    label: 'Failed',
    status: 'danger',
    icon: <ExclamationCircleIcon />,
    isFilled: true,
  },
  cancelled: {
    label: 'Canceled',
    color: 'grey',
    icon: <BanIcon />,
  },
  stopping: {
    label: 'Canceling',
    color: 'grey',
    icon: <InProgressIcon className="ai-u-spin" />,
  },
  stopped: {
    label: 'Stopped',
    color: 'grey',
    icon: <OffIcon />,
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
      variant={config.isFilled ? 'filled' : 'outline'}
      color={config.color}
      status={config.status}
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
