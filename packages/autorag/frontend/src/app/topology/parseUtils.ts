/**
 * Simplified parsing utilities for AutoRAG pipeline topology.
 * Only handles task nodes -- no artifact nodes.
 */
import { RunStatus } from '@patternfly/react-topology';
import { RuntimeStateKF, RunDetailsKF, TaskDetailKF } from '~/app/types/pipeline';
import { PipelineTaskRunStatus } from '~/app/types/topology';
import { isRunInTerminalState } from '~/app/utilities/utils';

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

const normalizeRuntimeStateInput = (state: unknown): string | undefined => {
  if (state == null) {
    return undefined;
  }

  if (typeof state !== 'string') {
    return undefined;
  }

  const normalized = state.trim();
  return normalized.length > 0 ? normalized : undefined;
};

/**
 * Translate a RuntimeStateKF to a PatternFly RunStatus for node rendering.
 */
export const translateStatusForNode = (state?: RuntimeStateKF | string): RunStatus | undefined => {
  const normalizedState = normalizeRuntimeStateInput(state);
  if (normalizedState == null) {
    return undefined;
  }

  switch (normalizedState.toUpperCase()) {
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

const isTaskTerminalFailure = (status: RunStatus | undefined): boolean =>
  status === RunStatus.Failed || status === RunStatus.Cancelled;

const getTerminalRunStatus = (runState?: string): RunStatus | undefined => {
  const normalizedRunState = normalizeRuntimeStateInput(runState);
  if (normalizedRunState == null || !isRunInTerminalState(normalizedRunState)) {
    return undefined;
  }

  return translateStatusForNode(normalizedRunState);
};

/** Parse run_details once per task id for reuse by status resolution and node creation. */
export const buildTaskRuntimeById = (
  taskIds: string[],
  runDetails?: RunDetailsKF,
): Map<string, PipelineTaskRunStatus | undefined> => {
  const runtimeByTaskId = new Map<string, PipelineTaskRunStatus | undefined>();
  for (const taskId of taskIds) {
    runtimeByTaskId.set(taskId, parseRuntimeInfoFromRunDetails(taskId, runDetails));
  }
  return runtimeByTaskId;
};

const buildDependentsByTaskId = (
  taskIds: string[],
  depsByTaskId: Map<string, string[]>,
): Map<string, string[]> => {
  const dependentsByTaskId = new Map<string, string[]>(taskIds.map((taskId) => [taskId, []]));
  for (const taskId of taskIds) {
    for (const dependency of depsByTaskId.get(taskId) ?? []) {
      dependentsByTaskId.get(dependency)?.push(taskId);
    }
  }
  return dependentsByTaskId;
};

const collectPendingDependents = (
  failureRoots: string[],
  dependentsByTaskId: Map<string, string[]>,
): Set<string> => {
  const pendingDependents = new Set<string>();
  const queue = [...failureRoots];

  while (queue.length > 0) {
    const taskId = queue.shift();
    if (taskId == null) {
      continue;
    }

    for (const dependent of dependentsByTaskId.get(taskId) ?? []) {
      if (!pendingDependents.has(dependent)) {
        pendingDependents.add(dependent);
        queue.push(dependent);
      }
    }
  }

  return pendingDependents;
};

/**
 * Resolves task-level statuses for fallback (pipeline_spec) topology when component
 * stage map data is unavailable. Scans all tasks for explicit terminal failures first;
 * run-level fallback applies only when no task failed explicitly in run_details, and
 * marks every unresolved task whose dependencies already succeeded (all parallel
 * siblings after a shared success), never only the first by topo/declaration order.
 */
export const resolveTaskTopologyRunStatuses = (
  taskIds: string[],
  runtimeByTaskId: Map<string, PipelineTaskRunStatus | undefined>,
  runState?: string,
  depsByTaskId: Map<string, string[]> = new Map(),
): Map<string, RunStatus | undefined> => {
  const statusById = new Map<string, RunStatus | undefined>();
  const terminalRunStatus = getTerminalRunStatus(runState);

  const inlineById = new Map<string, RunStatus | undefined>();
  for (const taskId of taskIds) {
    const runtime = runtimeByTaskId.get(taskId);
    inlineById.set(taskId, translateStatusForNode(runtime?.state));
  }

  const hasExplicitTaskFailure = taskIds.some((taskId) =>
    isTaskTerminalFailure(inlineById.get(taskId)),
  );

  for (const taskId of taskIds) {
    const inline = inlineById.get(taskId);
    if (inline != null) {
      statusById.set(taskId, inline);
    }
  }

  if (!hasExplicitTaskFailure && isTaskTerminalFailure(terminalRunStatus)) {
    // Infer failure only for tasks with no inline status. Preserve explicit
    // status from run_details even when the overall run is terminal.
    for (const taskId of taskIds) {
      if (statusById.has(taskId)) {
        continue;
      }
      const deps = depsByTaskId.get(taskId) ?? [];
      if (deps.every((dep) => statusById.get(dep) === RunStatus.Succeeded)) {
        statusById.set(taskId, terminalRunStatus);
      }
    }
  }

  const failureRoots = taskIds.filter((taskId) => isTaskTerminalFailure(statusById.get(taskId)));
  const pendingDependents = collectPendingDependents(
    failureRoots,
    buildDependentsByTaskId(taskIds, depsByTaskId),
  );

  for (const taskId of taskIds) {
    if (statusById.has(taskId)) {
      continue;
    }

    statusById.set(taskId, pendingDependents.has(taskId) ? RunStatus.Pending : undefined);
  }

  return statusById;
};
