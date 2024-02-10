import * as React from 'react';
import {
  Icon,
  Level,
  LevelItem,
  Spinner,
  Switch,
  Timestamp,
  TimestampTooltipVariant,
  Tooltip,
  Truncate,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { printSeconds, relativeDuration, relativeTime } from '~/utilities/time';
import {
  PipelineRunKFv2,
  runtimeStateLabels,
  PipelineRunJobKFv2,
  RecurringRunMode,
} from '~/concepts/pipelines/kfTypes';
import {
  getRunDuration,
  getPipelineRunJobScheduledState,
  ScheduledState,
} from '~/concepts/pipelines/content/tables/utils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { computeRunStatus } from '~/concepts/pipelines/content/utils';
import PipelinesTableRowTime from '~/concepts/pipelines/content/tables/PipelinesTableRowTime';

export const NoRunContent = (): React.JSX.Element => <>-</>;

type ExtraProps = Record<string, unknown>;
type RunUtil<P = ExtraProps> = React.FC<{ run: PipelineRunKFv2 } & P>;
type RunJobUtil<P = ExtraProps> = React.FC<{ job: PipelineRunJobKFv2 } & P>;

export const RunNameForPipeline: RunUtil = ({ run }) => {
  const { namespace } = usePipelinesAPI();
  return (
    // TODO: get link path
    <Link to={`/pipelines/${namespace}/pipelineRun/view/${run.run_id}`}>
      <Truncate content={run.display_name} />
    </Link>
  );
};

export const RunStatus: RunUtil<{ justIcon?: boolean }> = ({ justIcon, run }) => {
  const { icon, status, label, details } = computeRunStatus(run);
  let tooltipContent = details;

  const content = (
    <div style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
      <Icon isInline status={status}>
        {icon}
      </Icon>{' '}
      {!justIcon && label}
    </div>
  );

  if (justIcon && !tooltipContent) {
    // If we are just an icon with no tooltip -- make it the status for ease of understanding
    tooltipContent = runtimeStateLabels[run.state];
  }

  if (tooltipContent) {
    return <Tooltip content={tooltipContent}>{content}</Tooltip>;
  }
  return content;
};

export const RunDuration: RunUtil = ({ run }) => {
  const duration = getRunDuration(run);
  if (!duration) {
    // Kubeflow initial timestamp -- epoch, not an actual value
    return <NoRunContent />;
  }

  return <>{relativeDuration(duration)}</>;
};

export const RunCreated: RunUtil = ({ run }) => {
  const createdDate = new Date(run.created_at);
  return <PipelinesTableRowTime date={createdDate} />;
};

export const RunJobTrigger: RunJobUtil = ({ job }) => {
  if (job.trigger.periodic_schedule) {
    return <>Every {printSeconds(parseInt(job.trigger.periodic_schedule.interval_second))}</>;
  }
  if (job.trigger.cron_schedule) {
    // TODO: convert Cron into readable text
    return <>Cron {job.trigger.cron_schedule.cron}</>;
  }

  return <NoRunContent />;
};

export const RunJobScheduled: RunJobUtil = ({ job }) => {
  const [state, startDate, endDate] = getPipelineRunJobScheduledState(job);

  switch (state) {
    case ScheduledState.ENDED:
      return <>Completed</>;
    case ScheduledState.NOT_STARTED:
      if (startDate) {
        return (
          <Timestamp date={startDate} tooltip={{ variant: TimestampTooltipVariant.default }}>
            Starts {relativeTime(Date.now(), startDate.getTime())}
          </Timestamp>
        );
      }
      break;
    case ScheduledState.STARTED_NOT_ENDED:
      if (endDate) {
        return (
          <Timestamp date={endDate} tooltip={{ variant: TimestampTooltipVariant.default }}>
            Ends {relativeTime(Date.now(), endDate.getTime())}
          </Timestamp>
        );
      }
      break;
    case ScheduledState.UNBOUNDED_END:
      return <>On-going</>;
    default:
  }

  return <NoRunContent />;
};

export const RunJobStatus: RunJobUtil<{ onToggle: (value: boolean) => Promise<void> }> = ({
  job,
  onToggle,
}) => {
  const [error, setError] = React.useState<Error | null>(null);
  const [isChangingFlag, setIsChangingFlag] = React.useState(false);

  const isEnabled = job.mode === RecurringRunMode.ENABLE ?? false;
  React.useEffect(() => {
    // When the network updates, if we are currently locked fetching, disable it so we can accept the change
    setIsChangingFlag((v) => (v ? false : v));
  }, [isEnabled]);

  return (
    <Level hasGutter>
      <LevelItem data-testid="job-status-switch">
        <Switch
          id={`${job.recurring_run_id}-toggle`}
          aria-label={`Toggle switch; ${isEnabled ? 'Enabled' : 'Disabled'}`}
          isDisabled={isChangingFlag}
          onChange={(e, checked) => {
            setIsChangingFlag(true);
            setError(null);
            onToggle(checked).catch((err) => {
              setError(err);
              setIsChangingFlag(false);
            });
          }}
          isChecked={isEnabled}
        />
      </LevelItem>
      <LevelItem>
        {isChangingFlag && <Spinner size="md" />}
        {error && (
          <Tooltip content={error.message}>
            <Icon status="danger">
              <ExclamationCircleIcon />
            </Icon>
          </Tooltip>
        )}
      </LevelItem>
    </Level>
  );
};
