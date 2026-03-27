import * as React from 'react';
import { Icon, Label, LabelProps } from '@patternfly/react-core';
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
  },
  cancelled: {
    label: 'Canceled',
    color: 'grey',
    icon: <BanIcon />,
  },
  stopping: {
    label: 'Stopping',
    color: 'grey',
    icon: <InProgressIcon className="odh-u-spin" />,
  },
  stopped: {
    label: 'Stopped',
    color: 'grey',
    icon: <OffIcon />,
  },
};

type EvaluationStatusLabelProps = {
  state: EvaluationJobState;
};

const EvaluationStatusLabel: React.FC<EvaluationStatusLabelProps> = ({ state }) => {
  const config = statusMap[state];

  return (
    <Label
      variant="outline"
      color={config.color}
      status={config.status}
      icon={<Icon isInline>{config.icon}</Icon>}
      data-testid={`status-label-${state}`}
    >
      {config.label}
    </Label>
  );
};

export default EvaluationStatusLabel;
