import * as React from 'react';
import { Label, LabelProps } from '@patternfly/react-core';
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
import { getFailedBenchmarkCount } from '~/app/utilities/evaluationUtils';

type StatusConfig = {
  label: string;
  color?: LabelProps['color'];
  status?: LabelProps['status'];
  icon: React.ReactNode;
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
  // eslint-disable-next-line camelcase -- UI-only synthetic state: failed job where no benchmark ever received a started_at
  not_started: {
    label: 'Not started',
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
    status: 'danger',
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
  /** When true and state is 'failed', renders the "Not started" badge — no benchmark ever received a started_at timestamp. */
  isPreStartFailure?: boolean;
  onClick?: () => void;
  /** For partially_failed state: when provided, shows "X of Y failed" instead of "Partially failed". */
  benchmarks?: Array<{ status: string }>;
};

const EvaluationStatusLabel: React.FC<EvaluationStatusLabelProps> = ({
  state,
  isPreStartFailure,
  onClick,
  benchmarks,
}) => {
  const effectiveState = state === 'failed' && isPreStartFailure ? 'not_started' : state;
  const config = statusMap[effectiveState] ?? unknownStatusConfig;
  const label =
    effectiveState === 'partially_failed' && benchmarks != null
      ? `${getFailedBenchmarkCount(benchmarks)} of ${benchmarks.length} failed`
      : config.label;

  return (
    <Label
      variant="filled"
      color={config.color}
      status={config.status}
      icon={config.icon}
      data-testid={onClick ? 'evaluation-status-button' : `status-label-${state}`}
      {...(onClick ? { onClick } : {})}
    >
      {label}
    </Label>
  );
};

export default EvaluationStatusLabel;
