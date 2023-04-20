import * as React from 'react';
import {
  Icon,
  Timestamp,
  TimestampTooltipVariant,
  Tooltip,
  Truncate,
} from '@patternfly/react-core';
import {
  BanIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  QuestionCircleIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';
import { relativeDuration, relativeTime } from '~/utilities/time';
import { PipelineRunKF, PipelineRunStatusesKF } from '~/concepts/pipelines/kfTypes';

export const NoRunContent = () => <>-</>;

type RunUtil = React.FC<{ run: PipelineRunKF }>;

export const RunName: RunUtil = ({ run }) => <Truncate content={run.name} />;

export const RunStatus: RunUtil = ({ run }) => {
  let icon: React.ReactNode;
  let status: React.ComponentProps<typeof Icon>['status'];
  let tooltipContent: string | null = null;

  switch (run.status) {
    case PipelineRunStatusesKF.COMPLETED:
      icon = <CheckCircleIcon />;
      status = 'success';
      break;
    case PipelineRunStatusesKF.FAILED:
      icon = <ExclamationCircleIcon />;
      status = 'danger';
      // TODO: tooltipContent for error?
      // TODO: Make a PipelineRun fail
      break;
    case PipelineRunStatusesKF.RUNNING:
      icon = <SyncAltIcon />;
      break;
    case PipelineRunStatusesKF.CANCELLED:
      icon = <BanIcon />;
      break;
    default:
      icon = <QuestionCircleIcon />;
      status = 'warning';
      tooltipContent = run.status;
  }

  const content = (
    <div style={{ whiteSpace: 'nowrap' }}>
      <Icon isInline status={status}>
        {icon}
      </Icon>{' '}
      {run.status}
    </div>
  );

  if (tooltipContent) {
    return <Tooltip content={tooltipContent}>{content}</Tooltip>;
  }
  return content;
};

export const RunDuration: RunUtil = ({ run }) => {
  const finishedDate = new Date(run.finished_at);
  if (finishedDate.getFullYear() === 1970) {
    // Kubeflow initial timestamp -- epoch, not an actual value
    return <NoRunContent />;
  }

  const createdDate = new Date(run.created_at);
  const duration = finishedDate.getTime() - createdDate.getTime();
  return <Timestamp date={finishedDate}>{relativeDuration(duration)}</Timestamp>;
};

export const RunCreated: RunUtil = ({ run }) => {
  const createdDate = new Date(run.created_at);

  const content = relativeTime(Date.now(), createdDate.getTime());
  return (
    <Timestamp date={createdDate} tooltip={{ variant: TimestampTooltipVariant.default }}>
      <Truncate content={content}>{content}</Truncate>
    </Timestamp>
  );
};
