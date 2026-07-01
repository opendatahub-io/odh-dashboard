/**
 * Simplified parsing utilities for AutoML pipeline topology.
 * Only handles task nodes -- no artifact nodes.
 */
import { RunStatus } from '@patternfly/react-topology';
import { RuntimeStateKF, RunDetailsKF, TaskDetailKF } from '~/app/types/pipeline';
import { PipelineTaskRunStatus } from '~/app/types/topology';

// SUCCEEDED (60) outranks CANCELING (59) / CANCELED (51) because the KFP driver
// transitions to CANCELED after the main task has already completed successfully.
const statusWeight = (status?: RuntimeStateKF): number => {
  switch (status) {
    case RuntimeStateKF.PENDING:
      return 10;
    case RuntimeStateKF.RUNNING:
      return 20;
    case RuntimeStateKF.SKIPPED:
      return 30;
    case RuntimeStateKF.PAUSED:
      return 40;
    case RuntimeStateKF.CANCELED:
      return 51;
    case RuntimeStateKF.CANCELING:
      return 59;
    case RuntimeStateKF.SUCCEEDED:
      return 60;
    case RuntimeStateKF.FAILED:
      return 70;
    case RuntimeStateKF.RUNTIME_STATE_UNSPECIFIED:
    default:
      return 0;
  }
};

const worstStatus = (details: TaskDetailKF[]): TaskDetailKF['state'] =>
  details.toSorted(
    ({ state: stateA }, { state: stateB }) => statusWeight(stateB) - statusWeight(stateA),
  )[0].state;

/**
 * Get the run status of a task from the RunDetailsKF (task_details array).
 * Considers both the main task and its driver task, picking the most-progressed status.
 */
export const parseRuntimeInfoFromRunDetails = (
  taskId: string,
  runDetails?: RunDetailsKF,
): PipelineTaskRunStatus | undefined => {
  if (!runDetails?.task_details) {
    return undefined;
  }

  const nameVariants = [taskId, `${taskId}-driver`];
  const matchingDetails = runDetails.task_details.filter(
    (td) =>
      (td.display_name != null && nameVariants.includes(td.display_name)) ||
      nameVariants.includes(td.task_id),
  );

  if (matchingDetails.length === 0) {
    return undefined;
  }

  return {
    startTime: matchingDetails[0].start_time,
    completeTime: matchingDetails[0].end_time,
    state: worstStatus(matchingDetails),
    taskId: matchingDetails[0].task_id,
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
