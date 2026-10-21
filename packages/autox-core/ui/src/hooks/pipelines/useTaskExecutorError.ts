import { useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { findComponentTasksInRunDetails, findTaskDirPrefix } from './taskMatching';
import type { PipelineRun } from '../../api/pipelines/types';
import type { S3ListObjectsResponse } from '../../api/s3/types';
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
/**
 * Bounded rediscovery: the launcher uploads the executor log as the pod
 * exits, so the artifact can appear in S3 shortly after the run is already
 * marked FAILED — and both products disable refetch-on-window-focus, so an
 * empty discovery would otherwise stay empty until the panel is remounted.
 * While the hook is enabled, a discovery listing that has not yet yielded
 * its next stage is re-listed at this interval — including the task-dir
 * listing after execution directories have appeared, since a later retry
 * attempt's directory only shows up once it starts uploading artifacts.
 */
const EXECUTOR_LOG_REDISCOVERY_INTERVAL = 10_000;
/** Rediscovery stops after this window — past it, the artifact is not coming. */
const EXECUTOR_LOG_REDISCOVERY_WINDOW = 120_000;

export type UseTaskExecutorErrorOptions = {
  namespace?: string;
  runId?: string;
  pipelineRun?: PipelineRun;
  /** Stage-map component id, or the fallback-topology KFP task name (node id). */
  taskKey?: string;
  /** Product S3 root dir (e.g. 'documents-rag-optimization-pipeline'). */
  rootDir?: string;
  /**
   * Gate fetching — products pass `stepState === 'failed'`. Defaults to true.
   * When false, no stage issues queries or serves cached results.
   */
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

  // Candidate S3 dir names for the resolved task — only names the task itself
  // owns. Real KFP names the artifact dir after the display_name (task_id is
  // a UUID there); fake/seed data (mock BFF, standalone dev) uses the task
  // name as task_id. The component id is deliberately not a candidate: when
  // the resolved task is a branch variant (e.g. `x-2`) that crashed before
  // uploading artifacts, the unsuffixed component name would match a
  // successful sibling branch's directory and attribute the wrong step's log
  // to the failure.
  const candidateNames = useMemo(() => {
    if (!task) {
      return [];
    }
    return [
      ...new Set([task.display_name, task.task_id].filter((name): name is string => name != null)),
    ];
  }, [task]);

  const isEnabled = Boolean(enabled && namespace && runId && rootDir && task);

  // Rediscovery window anchor: recorded when the hook starts watching a
  // failed step, cleared when it disables. Selections can switch directly
  // between two failed steps (or the leaderboard between two failed runs)
  // without the hook ever disabling, so the anchor is keyed to the discovery
  // identity — when any input changes, the window restarts instead of the new
  // step inheriting an already-expired deadline. The write is idempotent for
  // a given identity, so writing during render is safe.
  const rediscoveryIdentity = isEnabled
    ? [namespace, runId, rootDir, taskKey, ...candidateNames].join('\u0000')
    : undefined;
  const rediscoveryAnchorRef = useRef<{ identity: string; startedAt: number } | undefined>(
    undefined,
  );
  if (rediscoveryIdentity === undefined) {
    rediscoveryAnchorRef.current = undefined;
  } else if (rediscoveryAnchorRef.current?.identity !== rediscoveryIdentity) {
    rediscoveryAnchorRef.current = { identity: rediscoveryIdentity, startedAt: Date.now() };
  }

  /**
   * `refetchInterval` callback for a discovery listing: poll while the hook
   * is enabled, the window is open, and `isStageUnresolved` holds for the
   * query's own latest data. React Query re-evaluates the callback after
   * every query event (each poll settles one), so both the stop predicate
   * and the time window stay fresh without re-renders.
   */
  const rediscoveryRefetchInterval = (
    isStageUnresolved: (data?: S3ListObjectsResponse) => boolean,
  ): ((query: { state: { data?: S3ListObjectsResponse } }) => number | false) => {
    const startedAt = rediscoveryAnchorRef.current?.startedAt;
    if (!isEnabled || startedAt === undefined) {
      return () => false;
    }
    return (query) =>
      isStageUnresolved(query.state.data) &&
      Date.now() - startedAt < EXECUTOR_LOG_REDISCOVERY_WINDOW
        ? EXECUTOR_LOG_REDISCOVERY_INTERVAL
        : false;
  };

  // Every stage below is explicitly gated on isEnabled (not just the first):
  // React Query serves cached data for a disabled query, so a warm cache from
  // a previously selected failed step must not let a disabled hook (e.g. the
  // user switched to a successful step) run the downstream discovery chain.

  // Stage 1: list the run's S3 directory. Same query key as useComponentStatuses
  // uses for terminal runs, so the listing is cache-shared in the common case.
  // Poll while the task's directory has not appeared in it yet.
  const runDirQuery = useS3ListFilesQuery(
    namespace,
    isEnabled ? `${rootDir}/${runId}` : undefined,
    {
      refetchInterval: rediscoveryRefetchInterval(
        (data) => findTaskDirPrefix(data?.common_prefixes ?? [], candidateNames) === undefined,
      ),
    },
  );

  // Stage 2: find the task's directory, then list its execution-uuid subdirs.
  const taskDirPrefix = useMemo(
    () => findTaskDirPrefix(runDirQuery.data?.common_prefixes ?? [], candidateNames),
    [runDirQuery.data, candidateNames],
  );
  // Keep re-listing the task dir for the whole rediscovery window, not just
  // until the first execution-uuid directory appears: a retried attempt gets
  // a new directory that shows up in S3 only once its artifacts start
  // uploading, so a listing that already has one attempt's directory can
  // still miss a later retry's. Unchanged listings keep the same data
  // reference (react-query structural sharing), so polling an already-listed
  // task dir does not churn the downstream stages.
  const taskDirQuery = useS3ListFilesQuery(namespace, isEnabled ? taskDirPrefix : undefined, {
    refetchInterval: rediscoveryRefetchInterval(() => true),
  });
  const executionPrefixes = useMemo(
    () => (isEnabled ? (taskDirQuery.data?.common_prefixes ?? []).map((p) => p.prefix) : []),
    [isEnabled, taskDirQuery.data],
  );

  // Stage 3: list each execution dir and pick the newest executor log.
  // Retried steps produce one uuid dir per attempt; an execution dir without
  // the artifact (pod crashed before upload) is skipped. Poll a dir while it
  // has not listed the log artifact yet.
  const executionDirQueries = useS3ListFilesQueries(namespace, executionPrefixes, {
    refetchInterval: rediscoveryRefetchInterval(
      (data) =>
        !(data?.contents ?? []).some((item) => item.key.endsWith(`/${EXECUTOR_LOG_FILE_NAME}`)),
    ),
  });
  const logKey = useMemo(() => {
    // Partial discovery failure: when any execution-dir listing errored, the
    // newest attempt's log may be hidden behind that error while an older
    // attempt's log is still visible. Degrade to "no log" rather than risk an
    // older retry's log standing in for the current failure. The rediscovery
    // polling above keeps retrying the errored listing within its window.
    if (executionDirQueries.some((query) => query.isError)) {
      return undefined;
    }
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
    enabled: Boolean(isEnabled && namespace && logKey),
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
