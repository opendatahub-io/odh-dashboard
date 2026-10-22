import type { PipelineRunTaskDetail } from '../../api/pipelines/types';

/**
 * Shared KFP task-matching helpers for resolving pipeline components to their
 * executor tasks and S3 artifact directories. Moved here from the autorag and
 * automl `useComponentStatuses` hooks (where they were duplicated verbatim).
 */

export function componentIdToTaskId(componentId: string): string {
  return componentId.replace(/_/g, '-');
}

/** Match a component's base task id or a KFP branch suffix variant (e.g. `-2`). */
export function matchesComponentTaskName(taskName: string, componentId: string): boolean {
  const baseTaskId = componentIdToTaskId(componentId);
  if (taskName === baseTaskId) {
    return true;
  }

  const suffixPrefix = `${baseTaskId}-`;
  if (!taskName.startsWith(suffixPrefix)) {
    return false;
  }

  const suffix = taskName.slice(suffixPrefix.length);
  return /^\d+$/.test(suffix);
}

/** KFP emits a lightweight `-driver` task per component; exclude it from status lookup. */
export const isKfpDriverTaskName = (taskName: string): boolean => taskName.endsWith('-driver');

/**
 * KFP emits system tasks alongside the component tasks: a pipeline wrapper
 * named `<pipelineName>-<random suffix>`, the `root` DAG task, and generic
 * `executor` tasks. They fail whenever the run does and produce no S3 executor
 * logs, so they must never be attributed as the failed step.
 *
 * The wrapper is only recognizable when the pipeline name is known (products
 * pass their S3 rootDir, which is named after the pipeline).
 */
export function isKfpSystemTaskName(taskName: string, pipelineName?: string): boolean {
  if (taskName === 'root' || taskName === 'executor') {
    return true;
  }
  return pipelineName != null && taskName.startsWith(`${pipelineName}-`);
}

/**
 * Resolve the executor task for a component from run details.
 * Task names may include a KFP branch numeric suffix (e.g. `-2`); that suffix
 * disambiguates conditional branches and is unrelated to retries or recency.
 * At most one matching executor task is expected per component.
 */
export function findComponentTaskInRunDetails(
  taskDetails: PipelineRunTaskDetail[],
  componentId: string,
): PipelineRunTaskDetail | undefined {
  return findComponentTasksInRunDetails(taskDetails, componentId)[0];
}

/**
 * All non-driver executor tasks matching the component (base name or a `-N`
 * branch suffix). Usually exactly one; fan-out components may yield several.
 */
export function findComponentTasksInRunDetails(
  taskDetails: PipelineRunTaskDetail[],
  componentId: string,
): PipelineRunTaskDetail[] {
  return taskDetails.filter((taskDetail) =>
    [taskDetail.task_id, taskDetail.display_name]
      .filter((name): name is string => name != null)
      .some((name) => !isKfpDriverTaskName(name) && matchesComponentTaskName(name, componentId)),
  );
}

/**
 * Task key for `useTaskExecutorError` naming the run's first failed executor
 * task — the step where the pipeline stopped. Prefers the display name (the
 * KFP artifact-dir name), falling back to the task id.
 *
 * `componentIds` is the product's stage-map component list in pipeline order.
 * When provided, the first component whose KFP task failed is used: KFP also
 * emits system tasks (a pipeline wrapper named after the pipeline, `root`, and
 * generic `executor` tasks) that fail whenever the run does and appear before
 * the component tasks in the listing, so raw task order cannot identify the
 * failed step. When none of the components failed, there is no step log to
 * attribute the failure to.
 *
 * Without a component list (the run failed before the stage map was
 * published), falls back to the first failed task that is neither a driver
 * nor a system task. `pipelineName` (the product's S3 rootDir, named after
 * the pipeline) is needed to recognize the pipeline-wrapper system task.
 */
export function findFirstFailedTaskKey(
  taskDetails: PipelineRunTaskDetail[],
  componentIds: string[] = [],
  pipelineName?: string,
): string | undefined {
  for (const componentId of componentIds) {
    const failed = findComponentTasksInRunDetails(taskDetails, componentId).find(
      (taskDetail) => taskDetail.state === 'FAILED',
    );
    if (failed) {
      return failed.display_name ?? failed.task_id;
    }
  }
  if (componentIds.length > 0) {
    return undefined;
  }
  const failed = taskDetails.find(
    (taskDetail) =>
      taskDetail.state === 'FAILED' &&
      !isKfpDriverTaskName(taskDetail.display_name ?? taskDetail.task_id) &&
      !isKfpSystemTaskName(taskDetail.display_name ?? taskDetail.task_id, pipelineName),
  );
  return failed?.display_name ?? failed?.task_id;
}

/**
 * Find the task's S3 directory in a run-directory listing by exact leaf-name
 * match. Callers must pass only names the selected task itself owns (its
 * display name, task id): S3 lists branch dirs lexicographically (`x-10/`
 * before `x-2/`, and both before the base `x/`), and when the selected task
 * crashed before uploading artifacts its directory is simply absent — in
 * that case a component-name candidate would otherwise adopt a successful
 * branch sibling's directory and attribute the wrong step's log to the
 * failure. Returns the prefix as listed (with trailing slash), or `undefined`
 * when none match.
 */
export function findTaskDirPrefix(
  commonPrefixes: { prefix: string }[],
  candidateNames: string[],
): string | undefined {
  const dirNameOf = (prefix: string): string => {
    const segments = prefix.split('/').filter(Boolean);
    return segments[segments.length - 1] ?? '';
  };
  return commonPrefixes.find(({ prefix }) => candidateNames.includes(dirNameOf(prefix)))?.prefix;
}
