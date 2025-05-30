import {
  PipelineRecurringRunKF,
  PipelineRunKF,
  PipelineSpecVariable,
} from '#~/concepts/pipelines/kfTypes';

export const getRunDuration = (run: PipelineRunKF): number => {
  const finishedDate = new Date(run.finished_at);
  if (finishedDate.getFullYear() <= 1970) {
    // Kubeflow initial timestamp -- epoch, not an actual value
    return 0;
  }

  const createdDate = new Date(run.created_at);
  return finishedDate.getTime() - createdDate.getTime();
};

export const getPipelineRecurringRunStartTime = (
  recurringRun: PipelineRecurringRunKF,
): Date | null => {
  const startTime =
    recurringRun.trigger.cron_schedule?.start_time ||
    recurringRun.trigger.periodic_schedule?.start_time;

  return startTime ? new Date(startTime) : null;
};

export const getPipelineRecurringRunEndTime = (
  recurringRun: PipelineRecurringRunKF,
): Date | null => {
  const endTime =
    recurringRun.trigger.cron_schedule?.end_time ||
    recurringRun.trigger.periodic_schedule?.end_time;

  return endTime ? new Date(endTime) : null;
};

export enum ScheduledState {
  NOT_STARTED,
  UNBOUNDED_END,
  STARTED_NOT_ENDED,
  ENDED,
}
export enum PipelineRunLabels {
  RECURRING = 'Recurring',
  ONEOFF = 'One-off',
}

const inPast = (date: Date | null): boolean => (date ? date.getTime() - Date.now() <= 0 : false);
export const getPipelineRecurringRunScheduledState = (
  recurringRun: PipelineRecurringRunKF,
): [state: ScheduledState, started: Date | null, ended: Date | null] => {
  const startDate = getPipelineRecurringRunStartTime(recurringRun);
  const endDate = getPipelineRecurringRunEndTime(recurringRun);
  const startDateInPast = inPast(startDate);
  const endDateInPast = inPast(endDate);

  let state: ScheduledState;
  if (!startDate || startDateInPast) {
    if (!endDate) {
      state = ScheduledState.UNBOUNDED_END;
    } else if (endDateInPast) {
      state = ScheduledState.ENDED;
    } else {
      state = ScheduledState.STARTED_NOT_ENDED;
    }
  } else {
    state = ScheduledState.NOT_STARTED;
  }

  return [state, startDate, endDate];
};

export const getPipelineRecurringRunExecutionCount = (resourceName: string): string | null => {
  const regex = /(\w+)(?:-[^-]*)?$/;
  const match = resourceName.match(regex);
  return match ? match[1] : null;
};

export const isArgoWorkflow = (spec?: PipelineSpecVariable): boolean =>
  !!spec && 'kind' in spec && spec.kind === 'Workflow';
