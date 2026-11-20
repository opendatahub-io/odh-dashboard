import * as React from 'react';
import { Label, LabelProps, Skeleton, Tooltip } from '@patternfly/react-core';
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
import { getEvaluationDisplayState } from '~/app/utilities/evaluationUtils';

type StatusConfig = {
  label: string;
  color?: LabelProps['color'];
  status?: LabelProps['status'];
  icon: React.ReactNode;
  isFilled?: boolean;
};

const statusMap: Partial<Record<EvaluationJobState | 'not_started' | 'queued', StatusConfig>> = {
  pending: {
    label: 'Pending',
    color: 'purple',
    icon: <PendingIcon />,
  },
  queued: {
    label: 'Queued',
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
  isQueued?: boolean;
  isLoading?: boolean;
  /** When true and state is 'failed', renders the "Not started" badge — no benchmark ever received a started_at timestamp. */
  isPreStartFailure?: boolean;
  /** The LocalQueue the evaluation is waiting in, shown in the queued-state tooltip. */
  queueName?: string;
  onClick?: () => void;
};

const EvaluationStatusLabel: React.FC<EvaluationStatusLabelProps> = ({
  state,
  isQueued,
  isLoading = false,
  isPreStartFailure,
  queueName,
  onClick,
}) => {
  if (isLoading) {
    return (
      <Skeleton
        width="100px"
        height="24px"
        screenreaderText="Loading evaluation status"
        data-testid="evaluation-status-loading"
      />
    );
  }

  const effectiveState = getEvaluationDisplayState(state, { isQueued, isPreStartFailure });
  const config = statusMap[effectiveState] ?? unknownStatusConfig;

  const label = (
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

  if (effectiveState !== 'queued') {
    return label;
  }

  return (
    <Tooltip
      content={
        queueName
          ? `Waiting in queue ${queueName} for resources to be allocated.`
          : 'Waiting for resources to be allocated.'
      }
    >
      <span>{label}</span>
    </Tooltip>
  );
};

export default EvaluationStatusLabel;
