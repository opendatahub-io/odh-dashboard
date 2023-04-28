import * as React from 'react';
import {
  Icon,
  Spinner,
  Switch,
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
import { Link } from 'react-router-dom';
import { printSeconds, relativeDuration, relativeTime } from '~/utilities/time';
import {
  PipelineRunJobKF,
  PipelineRunKF,
  PipelineRunLikeKF,
  PipelineRunStatusesKF,
  ResourceTypeKF,
} from '~/concepts/pipelines/kfTypes';
import {
  getPipelineRunJobEndTime,
  getPipelineRunJobStartTime,
  getPipelineRunLikeExperimentName,
  getRunResourceReference,
} from '~/concepts/pipelines/content/tables/utils';

export const NoRunContent = () => <>-</>;

type ExtraProps = Record<string, unknown>;
type RunUtil<P = ExtraProps> = React.FC<{ run: PipelineRunKF } & P>;
type RunLikeUtil<P = ExtraProps> = React.FC<{ runLike: PipelineRunLikeKF } & P>;
type RunJobUtil<P = ExtraProps> = React.FC<{ job: PipelineRunJobKF } & P>;

export const RunName: RunUtil = ({ run }) => <Truncate content={run.name} />;

export const RunStatus: RunUtil<{ justIcon?: boolean }> = ({ justIcon, run }) => {
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
    <div style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
      <Icon isInline status={status}>
        {icon}
      </Icon>{' '}
      {!justIcon && run.status}
    </div>
  );

  if (justIcon && !tooltipContent) {
    // If we are just an icon with no tooltip -- make it the status for ease of understanding
    tooltipContent = run.status;
  }

  if (tooltipContent) {
    return <Tooltip content={tooltipContent}>{content}</Tooltip>;
  }
  return content;
};

export const RunDuration: RunUtil = ({ run }) => {
  const finishedDate = new Date(run.finished_at);
  if (finishedDate.getFullYear() <= 1970) {
    // Kubeflow initial timestamp -- epoch, not an actual value
    return <NoRunContent />;
  }

  const createdDate = new Date(run.created_at);
  const duration = finishedDate.getTime() - createdDate.getTime();
  return <Timestamp date={finishedDate}>{relativeDuration(duration)}</Timestamp>;
};

export const RunCreated: RunUtil = ({ run }) => {
  const createdDate = new Date(run.created_at);
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <Timestamp date={createdDate} tooltip={{ variant: TimestampTooltipVariant.default }}>
        {relativeTime(Date.now(), createdDate.getTime())}
      </Timestamp>
    </span>
  );
};

export const RunLikeExperiment: RunLikeUtil = ({ runLike }) => (
  <>{getPipelineRunLikeExperimentName(runLike)}</>
);

export const RunLikePipeline: RunLikeUtil<{ namespace: string }> = ({ runLike, namespace }) => {
  const resourceRef = getRunResourceReference(runLike, ResourceTypeKF.PIPELINE_VERSION);
  const pipelineName = resourceRef?.name;
  if (!resourceRef || !pipelineName) {
    return <>-</>;
  }
  const pipelineId = resourceRef.key.id;

  return <Link to={`/pipelineRuns/${namespace}/${pipelineId}`}>{pipelineName}</Link>;
};

export const RunJobTrigger: RunJobUtil = ({ job }) => {
  if (job.trigger.periodic_schedule) {
    return <>Every {printSeconds(parseInt(job.trigger.periodic_schedule.interval_second))}</>;
  }
  if (job.trigger.cron_schedule) {
    // TODO: convert Cron into readable text
    return <>Cron {job.trigger.cron_schedule.cron}</>;
  }

  return <>Unknown</>;
};

const inPast = (date: Date | null): boolean => (date ? date.getTime() - Date.now() <= 0 : false);
export const RunJobScheduled: RunJobUtil = ({ job }) => {
  const startDate = getPipelineRunJobStartTime(job);
  const startDateInPast = inPast(startDate);
  if (!startDate || startDateInPast) {
    const endDate = getPipelineRunJobEndTime(job);
    if (!endDate) {
      return <>On-going</>;
    }

    const endDateInPast = inPast(endDate);
    if (endDateInPast) {
      return <>Completed</>;
    }

    return (
      <Timestamp date={endDate} tooltip={{ variant: TimestampTooltipVariant.default }}>
        Ends {relativeTime(Date.now(), endDate.getTime())}
      </Timestamp>
    );
  }

  return (
    <Timestamp date={startDate} tooltip={{ variant: TimestampTooltipVariant.default }}>
      Starts {relativeTime(Date.now(), startDate.getTime())}
    </Timestamp>
  );
};

export const RunJobStatus: RunJobUtil<{ onToggle: (value: boolean) => Promise<void> }> = ({
  job,
  onToggle,
}) => {
  const [error, setError] = React.useState<Error | null>(null);
  const [isChangingFlag, setIsChangingFlag] = React.useState(false);

  const isEnabled = job.enabled ?? false;
  React.useEffect(() => {
    // When the network updates, if we are currently locked fetching, disable it so we can accept the change
    setIsChangingFlag((v) => (v ? false : v));
  }, [isEnabled]);

  return (
    <Switch
      id={`${job.id}-toggle`}
      isDisabled={isChangingFlag}
      onChange={(checked) => {
        setIsChangingFlag(true);
        setError(null);
        onToggle(checked).catch((e) => {
          setError(e);
          setIsChangingFlag(false);
        });
      }}
      isChecked={isEnabled}
      label={
        <>
          {isChangingFlag && <Spinner size="md" />}
          {error && (
            <Tooltip content={error.message}>
              <Icon status="danger">
                <ExclamationCircleIcon />
              </Icon>
            </Tooltip>
          )}
        </>
      }
    />
  );
};
