import {
  PipelineRecurringRunKF,
  PipelineRunKF,
  PipelineSpecVariable,
  RuntimeStateKF,
} from '#~/concepts/pipelines/kfTypes';

/**
 * Minimal shape accepted by getRunStartTime so it works with both PipelineRunKF
 * (main dashboard) and PipelineRun (automl / autorag) without coupling their types.
 */
type RunWithStateHistory = { created_at: string; state_history?: object[] };

type StateHistoryEntry = { state: unknown; update_time: unknown };

const isValidHistoryEntry = (entry: unknown): entry is StateHistoryEntry =>
  typeof entry === 'object' && entry !== null && 'state' in entry && 'update_time' in entry;

/**
 * Find the actual execution start time from the last RUNNING entry in state_history,
 * falling back to created_at for runs without history.
 */
export const getRunStartTime = (run: RunWithStateHistory): Date => {
  const history = run.state_history ?? [];
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    if (isValidHistoryEntry(entry) && String(entry.state) === RuntimeStateKF.RUNNING) {
      return new Date(String(entry.update_time));
    }
  }
  return new Date(run.created_at);
};

export const getRunDuration = (run: PipelineRunKF): number => {
  const finishedDate = new Date(run.finished_at);
  if (finishedDate.getFullYear() <= 1970) {
    // Kubeflow initial timestamp -- epoch, not an actual value
    return 0;
  }

  return finishedDate.getTime() - getRunStartTime(run).getTime();
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
