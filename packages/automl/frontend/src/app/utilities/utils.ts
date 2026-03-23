import type { PipelineRun } from '~/app/types';
import {
  TASK_TYPE_BINARY,
  TASK_TYPE_MULTICLASS,
  TASK_TYPE_REGRESSION,
  TASK_TYPE_TIMESERIES,
} from './const';

/**
 * Determines if a task type is tabular.
 * @param pipelineRun - The pipeline run to check
 * @returns true if the task type is tabular, false otherwise
 */
export const isTabularRun = (pipelineRun?: PipelineRun): boolean => {
  const taskType = pipelineRun?.runtime_config?.parameters?.task_type ?? TASK_TYPE_TIMESERIES;

  return [TASK_TYPE_BINARY, TASK_TYPE_MULTICLASS, TASK_TYPE_REGRESSION].includes(taskType);
};

/**
 * Gets the optimized metric for a given task type.
 * @param taskType - The task type to get the metric for
 * @returns The optimized metric name, or undefined if not found
 */
export function getOptimizedMetricForTask(taskType: string): string | undefined {
  switch (taskType) {
    case TASK_TYPE_BINARY:
    case TASK_TYPE_MULTICLASS:
      return 'accuracy';
    case TASK_TYPE_REGRESSION:
      return 'r2';
    case TASK_TYPE_TIMESERIES:
      return 'smape';
    default:
      return undefined;
  }
}
