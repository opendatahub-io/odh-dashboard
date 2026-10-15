import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  componentIdToTaskId,
  findComponentTasksInRunDetails,
  findTaskDirPrefix,
} from './taskMatching';
import type { PipelineRun } from '../../api/pipelines/types';
import { extractExecutorLogError } from '../../utils/executorLogError';
import { useS3FileFetchers } from '../s3/useS3FileFetchers';
import { useS3ListFilesQueries, useS3ListFilesQuery } from '../s3/useS3ListFilesQuery';

/** KFP launcher artifact holding the component's stdout/stderr (incl. tracebacks). */
const EXECUTOR_LOG_FILE_NAME = 'executor-logs-0';
/**
 * Safety valve — the BFF only streams whole objects (no tail/range support).
 * Larger logs fail the download and the UI falls back to the generic message.
 */
const EXECUTOR_LOG_MAX_BYTES = 10 * 1024 * 1024;
const EXECUTOR_LOG_STALE_TIME = 30_000;

export type UseTaskExecutorErrorOptions = {
  namespace?: string;
  runId?: string;
  pipelineRun?: PipelineRun;
  /** Stage-map component id, or the fallback-topology KFP task name (node id). */
  taskKey?: string;
  /** Product S3 root dir (e.g. 'documents-rag-optimization-pipeline'). */
  rootDir?: string;
  /** Gate fetching — products pass `stepState === 'failed'`. Defaults to true. */
  enabled?: boolean;
};

export type TaskExecutorError = {
  /** Extracted failure message; undefined when none extracted (fall back to generic text). */
  errorMessage?: string;
  /** Full executor log text; undefined until fetched. Shown in the log tearsheet. */
  logText?: string;
  /** Full S3 key of the executor log the message was extracted from. */
  logKey?: string;
  /** True while any discovery/fetch stage is in flight. */
  isLoading: boolean;
  /** True when a stage failed (missing dirs are successful-empty, not errors). */
  isError: boolean;
};

type ExecutorLogContent = {
  errorMessage?: string;
  logText: string;
};

/**
 * Fetch the actual failure message for a failed pipeline step from the KFP
 * launcher's `executor-logs-0` S3 artifact.
 *
 * The KFP APIs return no per-task error details on DSP v2, but the launcher
 * uploads each component's stdout/stderr to
 * `{rootDir}/{runId}/{taskName}/{executionUuid}/executor-logs-0`. This hook
 * resolves the step's task, walks that S3 path (listing each level, since the
 * execution uuid is nondeterministic), picks the newest executor log, and
 * extracts the traceback. Consumers should render `errorMessage` when present
 * and fall back to their generic failure text otherwise.
 */
export function useTaskExecutorError(options: UseTaskExecutorErrorOptions): TaskExecutorError {
  const { namespace, runId, pipelineRun, taskKey, rootDir, enabled = true } = options;

  // Resolve the KFP executor task for the step's component. When several
  // tasks match (branch fan-out), prefer the failed one — note this attributes
  // the first failed execution when several sibling branches failed.
  const task = useMemo(() => {
    if (!taskKey || !pipelineRun) {
      return undefined;
    }
    const matches = findComponentTasksInRunDetails(
      pipelineRun.run_details?.task_details ?? [],
      taskKey,
    );
    if (matches.length <= 1) {
      return matches[0];
    }
    return matches.find((t) => t.state === 'FAILED') ?? matches[0];
  }, [pipelineRun, taskKey]);

  // Candidate S3 dir names for the task. Real KFP names the artifact dir
  // after the display_name (task_id is a UUID there); fake/seed data (mock
  // BFF, standalone dev) uses the task name as task_id. The component-id form
  // covers stage-map callers passing an underscore id.
  const candidateNames = useMemo(() => {
    if (!task || !taskKey) {
      return [];
    }
    return [
      ...new Set(
        [task.display_name, task.task_id, componentIdToTaskId(taskKey)].filter(
          (name): name is string => name != null,
        ),
      ),
    ];
  }, [task, taskKey]);

  const isEnabled = Boolean(enabled && namespace && runId && rootDir && task);

  // Stage 1: list the run's S3 directory. Same query key as useComponentStatuses
  // uses for terminal runs, so the listing is cache-shared in the common case.
  const runDirQuery = useS3ListFilesQuery(namespace, isEnabled ? `${rootDir}/${runId}` : undefined);

  // Stage 2: find the task's directory, then list its execution-uuid subdirs.
  const taskDirPrefix = useMemo(
    () => findTaskDirPrefix(runDirQuery.data?.common_prefixes ?? [], candidateNames),
    [runDirQuery.data, candidateNames],
  );
  const taskDirQuery = useS3ListFilesQuery(namespace, taskDirPrefix);
  const executionPrefixes = useMemo(
    () => (taskDirQuery.data?.common_prefixes ?? []).map((p) => p.prefix),
    [taskDirQuery.data],
  );

  // Stage 3: list each execution dir and pick the newest executor log.
  // Retried steps produce one uuid dir per attempt; an execution dir without
  // the artifact (pod crashed before upload) is skipped.
  const executionDirQueries = useS3ListFilesQueries(namespace, executionPrefixes);
  const logKey = useMemo(() => {
    let best: { key: string; lastModified?: string } | undefined;
    for (const query of executionDirQueries) {
      for (const item of query.data?.contents ?? []) {
        if (!item.key.endsWith(`/${EXECUTOR_LOG_FILE_NAME}`)) {
          continue;
        }
        const lastModified = item.last_modified ?? '';
        if (
          best === undefined ||
          lastModified > (best.lastModified ?? '') ||
          (lastModified === (best.lastModified ?? '') && item.key > best.key)
        ) {
          best = { key: item.key, lastModified };
        }
      }
    }
    return best?.key;
    // executionDirQueries is a new array each render; the scan is trivial and
    // logKey is a primitive, so memoization here is only an allocation guard.
  }, [executionDirQueries]);

  // Stage 4: fetch the log and extract the failure message.
  const { fetchS3File } = useS3FileFetchers();
  const errorQuery = useQuery<ExecutorLogContent, Error>({
    queryKey: ['taskExecutorError', namespace, logKey],
    queryFn: async ({ signal }) => {
      if (!namespace || !logKey) {
        throw new Error('namespace and logKey are required');
      }
      const blob = await fetchS3File(namespace, logKey, {
        signal,
        maxBytes: EXECUTOR_LOG_MAX_BYTES,
      });
      const logText = await blob.text();
      return { errorMessage: extractExecutorLogError(logText), logText };
    },
    enabled: Boolean(namespace && logKey),
    retry: false,
    staleTime: EXECUTOR_LOG_STALE_TIME,
  });

  const isLoading =
    runDirQuery.isLoading ||
    taskDirQuery.isLoading ||
    executionDirQueries.some((query) => query.isLoading) ||
    errorQuery.isLoading;
  const isError =
    runDirQuery.isError ||
    taskDirQuery.isError ||
    executionDirQueries.some((query) => query.isError) ||
    errorQuery.isError;

  return useMemo(
    () => ({
      errorMessage: errorQuery.data?.errorMessage,
      logText: errorQuery.data?.logText,
      logKey,
      isLoading,
      isError,
    }),
    [errorQuery.data, logKey, isLoading, isError],
  );
}
