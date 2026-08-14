import * as React from 'react';
import { Label, LabelProps } from '@patternfly/react-core';
import {
  BanIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
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
  isFilled?: boolean;
};

const statusMap: Partial<Record<EvaluationJobState | 'not_started', StatusConfig>> = {
  pending: {
    label: 'Pending',
    color: 'purple',
    icon: <PendingIcon />,
  },
  running: {
    label: 'Running',
    color: 'blue',
    icon: <InProgressIcon className="ai-u-spin" />,
    isFilled: true,
  },
  completed: {
    label: 'Complete',
    status: 'success',
    icon: <CheckCircleIcon />,
    isFilled: true,
  },
  failed: {
    label: 'Failed',
    status: 'danger',
    icon: <ExclamationCircleIcon />,
    isFilled: true,
  },
  // eslint-disable-next-line camelcase -- UI-only synthetic state: failed job where no benchmark ever received a started_at
  not_started: {
    label: 'Not started',
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

const unknownStatusConfig: StatusConfig = {
  label: 'Unknown',
  color: 'grey',
  icon: <QuestionCircleIcon />,
};

type EvaluationStatusLabelProps = {
  state: EvaluationJobState;
  /** When true and state is 'failed', renders the "Not started" badge — no benchmark ever received a started_at timestamp. */
  isPreStartFailure?: boolean;
  onClick?: () => void;
};

const EvaluationStatusLabel: React.FC<EvaluationStatusLabelProps> = ({
  state,
  isPreStartFailure,
  onClick,
}) => {
  const effectiveState =
    state === 'failed' && isPreStartFailure
      ? 'not_started'
      : state === 'partially_failed'
        ? 'failed'
        : state;
  const config = statusMap[effectiveState] ?? unknownStatusConfig;

  return (
    <Label
      variant={config.isFilled ? 'filled' : 'outline'}
      color={config.color}
      status={config.status}
      icon={config.icon}
      data-testid={onClick ? 'evaluation-status-button' : `status-label-${state}`}
      {...(onClick ? { onClick } : {})}
    >
      {config.label}
    </Label>
  );
};

export default EvaluationStatusLabel;
