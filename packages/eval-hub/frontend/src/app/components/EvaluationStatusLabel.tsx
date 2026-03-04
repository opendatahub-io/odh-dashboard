import * as React from 'react';
import { Icon, Label } from '@patternfly/react-core';
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
};

const EvaluationStatusLabel: React.FC<EvaluationStatusLabelProps> = ({ state }) => {
  const config = statusMap[state];

  return (
    <Label
      color={config.color}
      icon={<Icon isInline>{config.icon}</Icon>}
      data-testid={`status-label-${state}`}
    >
      {config.label}
    </Label>
  );
};

export default EvaluationStatusLabel;
