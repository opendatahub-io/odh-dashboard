import * as React from 'react';
import { Icon, Label, LabelProps } from '@patternfly/react-core';
import {
  BanIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InProgressIcon,
  OffIcon,
  PendingIcon,
  QuestionCircleIcon,
} from '@patternfly/react-icons';
import { EvaluationJobState } from '~/app/types';

type StatusConfig = {
  label: string;
  color?: LabelProps['color'];
  status?: LabelProps['status'];
  icon: React.ReactNode;
};

const statusMap: Partial<Record<EvaluationJobState, StatusConfig>> = {
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
    label: 'Canceling',
    color: 'grey',
    icon: <InProgressIcon className="ai-u-spin" />,
  },
  stopped: {
    label: 'Stopped',
    color: 'grey',
    icon: <OffIcon />,
  },

  // eslint-disable-next-line camelcase -- matches the API's state value verbatim
  partially_failed: {
    label: 'Partially failed',
    status: 'warning',
    icon: <ExclamationTriangleIcon />,
  },
};

const unknownStatusConfig: StatusConfig = {
  label: 'Unknown',
  color: 'grey',
  icon: <QuestionCircleIcon />,
};

type EvaluationStatusLabelProps = {
  state: EvaluationJobState;
  onClick?: () => void;
};

const EvaluationStatusLabel: React.FC<EvaluationStatusLabelProps> = ({ state, onClick }) => {
  const config = statusMap[state] ?? unknownStatusConfig;

  return (
    <Label
      variant="filled"
      color={config.color}
      status={config.status}
      icon={<Icon isInline>{config.icon}</Icon>}
      data-testid={`status-label-${state}`}
      {...(onClick ? { onClick } : {})}
    >
      {config.label}
    </Label>
  );
};

export default EvaluationStatusLabel;
