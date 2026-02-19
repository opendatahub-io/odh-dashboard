/**
 * Simplified parsing utilities for AutoRAG pipeline topology.
 * Only handles task nodes -- no artifact nodes.
 */
import { RunStatus } from '@patternfly/react-topology';
import { RuntimeStateKF, RunDetailsKF } from '~/app/types/pipeline';
import { PipelineTaskRunStatus } from '~/app/types/topology';

/**
 * Get the run status of a task from the RunDetailsKF (task_details array).
 */
export const parseRuntimeInfoFromRunDetails = (
  taskId: string,
  runDetails?: RunDetailsKF,
): PipelineTaskRunStatus | undefined => {
  if (!runDetails) {
    return undefined;
  }

  const taskDetail = runDetails.task_details.find(
    (td) => td.display_name === taskId || td.task_id === taskId,
  );

  if (!taskDetail) {
    return undefined;
  }

  return {
    startTime: taskDetail.start_time,
    completeTime: taskDetail.end_time,
    state: taskDetail.state,
    taskId: taskDetail.task_id,
  };
};

/**
 * Translate a RuntimeStateKF to a PatternFly RunStatus for node rendering.
 */
export const translateStatusForNode = (state?: RuntimeStateKF | string): RunStatus | undefined => {
  switch (state) {
    case RuntimeStateKF.SUCCEEDED:
    case 'SUCCEEDED':
      return RunStatus.Succeeded;
    case RuntimeStateKF.FAILED:
    case 'FAILED':
      return RunStatus.Failed;
    case RuntimeStateKF.RUNNING:
    case 'RUNNING':
      return RunStatus.InProgress;
    case RuntimeStateKF.PENDING:
    case 'PENDING':
      return RunStatus.Pending;
    case RuntimeStateKF.CANCELED:
    case 'CANCELED':
      return RunStatus.Cancelled;
    case RuntimeStateKF.CANCELING:
    case 'CANCELING':
      return RunStatus.Cancelled;
    case RuntimeStateKF.SKIPPED:
    case 'SKIPPED':
      return RunStatus.Skipped;
    case RuntimeStateKF.CACHED:
    case 'CACHED':
      return RunStatus.Succeeded;
    case RuntimeStateKF.PAUSED:
    case 'PAUSED':
      return RunStatus.Pending;
    default:
      return undefined;
  }
};
