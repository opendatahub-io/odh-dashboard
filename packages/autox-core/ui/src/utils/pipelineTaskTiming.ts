import { isRunInTerminalState } from '../api/pipelines/kfTypes';
import type { PipelineRunStateHistoryEntry, PipelineRunTaskDetail } from '../api/pipelines/types';

type PipelineTaskTimingInput = Pick<
  PipelineRunTaskDetail,
  'create_time' | 'start_time' | 'end_time' | 'state_history'
>;

export type PipelineTaskTiming = {
  /** Start of the latest attempt, including its queue time when available. */
  start?: string;
  end?: string;
  /** Start of the latest retry, or undefined when the task has not been retried. */
  retryStart?: string;
};

const RETRY_START_STATES = new Set(['PENDING', 'RUNNING']);

const getLatestRetryStart = (stateHistory?: PipelineRunStateHistoryEntry[]): string | undefined => {
  if (!stateHistory?.length) {
    return undefined;
  }

  const history = stateHistory
    .flatMap((entry, index) => {
      if (typeof entry.update_time !== 'string' || typeof entry.state !== 'string') {
        return [];
      }

      const timestamp = Date.parse(entry.update_time);
      if (!Number.isFinite(timestamp)) {
        return [];
      }

      return [
        {
          index,
          timestamp,
          updateTime: entry.update_time,
          state: entry.state.trim().toUpperCase(),
        },
      ];
    })
    .toSorted((left, right) => left.timestamp - right.timestamp || left.index - right.index);

  let retryStart: string | undefined;
  for (let index = 1; index < history.length; index += 1) {
    const previous = history[index - 1];
    const current = history[index];
    if (isRunInTerminalState(previous.state) && RETRY_START_STATES.has(current.state)) {
      retryStart = current.updateTime;
    }
  }

  return retryStart;
};

/**
 * Resolve timestamps for a task's latest attempt. KFP can retain the original
 * `start_time` after a retry while updating `end_time`, so state history is
 * authoritative when it records a terminal-to-pending/running transition.
 */
export const getPipelineTaskTiming = (task?: PipelineTaskTimingInput): PipelineTaskTiming => {
  const retryStart = getLatestRetryStart(task?.state_history);
  return {
    start: retryStart ?? task?.start_time ?? task?.create_time,
    end: task?.end_time,
    retryStart,
  };
};

/** Ignore stage timestamps from an earlier attempt when a retry is present. */
export const getPipelineTaskAttemptTimestamp = (
  timestamp?: string,
  retryStart?: string,
): string | undefined => {
  if (!timestamp || !retryStart) {
    return timestamp;
  }

  const timestampValue = Date.parse(timestamp);
  const retryStartValue = Date.parse(retryStart);
  if (
    !Number.isFinite(timestampValue) ||
    !Number.isFinite(retryStartValue) ||
    timestampValue >= retryStartValue
  ) {
    return timestamp;
  }

  return undefined;
};
