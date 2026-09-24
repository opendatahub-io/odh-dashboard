import * as React from 'react';
import { Label, LabelProps, Tooltip } from '@patternfly/react-core';
import {
  BanIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  OffIcon,
  PendingIcon,
  QuestionCircleIcon,
} from '@patternfly/react-icons';
import { EvaluationJobState, KueueWorkloadStatus } from '~/app/types';
import { getEvaluationDisplayState } from '~/app/utilities/evaluationUtils';

type StatusConfig = {
  label: string;
  color?: LabelProps['color'];
  status?: LabelProps['status'];
  icon: React.ReactNode;
  isFilled?: boolean;
};

const statusMap: Partial<
  Record<EvaluationJobState | 'not_started' | 'queued' | 'admitted', StatusConfig>
> = {
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
  admitted: {
    label: 'Admitted',
    color: 'blue',
    icon: <InProgressIcon className="ai-u-spin" />,
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

export const getKueueTooltipText = (status: KueueWorkloadStatus): string => {
  switch (status.state) {
    case 'queued':
      return 'Waiting for Kueue to allocate resources.';
    case 'preempted':
      return 'Kueue released this evaluation’s resources. It is waiting to be scheduled again.';
    case 'admitted':
      return 'Kueue allocated resources to this evaluation.';
    default:
      return '';
  }
};

type EvaluationStatusLabelProps = {
  state: EvaluationJobState;
  isQueued?: boolean;
  /** When true and state is 'failed', renders the "Not started" badge — no benchmark ever received a started_at timestamp. */
  isPreStartFailure?: boolean;
  /** A live Kueue Workload status that can describe its active scheduling state. */
  kueueWorkloadStatus?: KueueWorkloadStatus;
  onClick?: () => void;
};

const EvaluationStatusLabel: React.FC<EvaluationStatusLabelProps> = ({
  state,
  isQueued,
  isPreStartFailure,
  kueueWorkloadStatus,
  onClick,
}) => {
  const effectiveState = getEvaluationDisplayState(state, {
    isQueued,
    isPreStartFailure,
    kueueWorkloadStatus,
  });
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

  const shouldShowKueueDetails =
    (effectiveState === 'queued' || effectiveState === 'admitted') &&
    (kueueWorkloadStatus?.state === 'queued' ||
      kueueWorkloadStatus?.state === 'preempted' ||
      kueueWorkloadStatus?.state === 'admitted');

  if (!shouldShowKueueDetails) {
    return label;
  }

  return (
    <Tooltip
      content={
        <>
          <div>{getKueueTooltipText(kueueWorkloadStatus)}</div>
          {kueueWorkloadStatus.message ? <div>{kueueWorkloadStatus.message}</div> : null}
        </>
      }
    >
      <span>{label}</span>
    </Tooltip>
  );
};

export default EvaluationStatusLabel;
