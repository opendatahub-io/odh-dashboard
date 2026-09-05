import React from 'react';
import * as z from 'zod';
import { fetchS3Json, useS3ListFilesQuery } from '~/app/hooks/queries';
import { useAutomlOutputDir } from '~/app/hooks/useAutomlOutputDir';
import type {
  ComponentStageMap,
  ComponentStageMapComponent,
  ComponentStageMapStage,
} from '~/app/hooks/useComponentStageMap';
import type { PipelineRun, PipelineRunError, S3ListObjectsResponse } from '~/app/types';
import { getFiles as getS3Files } from '~/app/api/s3';
import {
  findTrainingTaskPrefix,
  isRunCompleted,
  isRunInTerminalState,
  normalizePipelineRunState,
} from '~/app/utilities/utils';

type ComponentTaskDetail = {
  task_id: string;
  display_name?: string;
  state?: string;
  create_time?: string;
  start_time?: string;
  end_time?: string;
  error?: PipelineRunError;
};

/** Documented inline stage statuses (aligned with translateStageStatus). */
export const COMPONENT_STAGE_STATUSES = ['completed', 'started', 'failed', 'skipped'] as const;
export type ComponentStageStatus = (typeof COMPONENT_STAGE_STATUSES)[number];

const MetricValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.union([z.string(), z.number(), z.boolean()])),
]);
const TimestampSchema = z.string().datetime({ offset: false });
const IdentifierSchema = z.string().regex(/^[a-z][a-z0-9_]*$/);

const ComponentStatusMessageSchema = z
  .object({
    level: z.enum(['info', 'warning', 'error']),
    text: z.string().min(1),
  })
  .strict();

/* eslint-disable camelcase */
const ComponentStatusStateSchema = z
  .object({
    state: z.enum(['started', 'running', 'completed', 'failed']),
    step: z.string().optional(),
    message: ComponentStatusMessageSchema.optional(),
    running_at: TimestampSchema.optional(),
  })
  .strict();
/* eslint-enable camelcase */

/** Normalize and accept only documented stage statuses; unsupported values become undefined. */
export function normalizeComponentStageStatus(value: unknown): ComponentStageStatus | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  for (const status of COMPONENT_STAGE_STATUSES) {
    if (status === normalized) {
      return status;
    }
  }
  return undefined;
}

/* eslint-disable camelcase */
const ComponentStatusStageSchema = z.union([
  z
    .object({
      id: IdentifierSchema,
      status: ComponentStatusStateSchema.extend({ state: z.literal('failed') }),
      metrics: z.record(z.string(), MetricValueSchema).optional(),
      error: z.string().optional(),
    })
    .strict(),
  z
    .object({
      id: IdentifierSchema,
      status: ComponentStatusStateSchema.extend({
        state: z.enum(['started', 'running', 'completed']),
      }),
      metrics: z.record(z.string(), MetricValueSchema).optional(),
    })
    .strict(),
]);

export const ComponentStatusFileSchema = z
  .object({
    component_id: IdentifierSchema,
    started_at: TimestampSchema,
    completed_at: TimestampSchema.optional(),
    stages: z.array(ComponentStatusStageSchema),
    metadata: z.object({ display_name: z.string().min(1) }).catchall(z.unknown()),
  })
  .strict();

export type ComponentStatusFile = z.infer<typeof ComponentStatusFileSchema>;
export type ComponentStatusStage = z.infer<typeof ComponentStatusStageSchema>;
/* eslint-enable camelcase */

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
 * Resolve the executor task for a component from run details.
 * Task names may include a KFP branch numeric suffix (e.g. `-2`); that suffix
 * disambiguates conditional branches and is unrelated to retries or recency.
 * At most one matching executor task is expected per component.
 */
export function findComponentTaskInRunDetails(
  taskDetails: ComponentTaskDetail[],
  componentId: string,
): ComponentTaskDetail | undefined {
  return taskDetails.find((taskDetail) =>
    [taskDetail.task_id, taskDetail.display_name]
      .filter((name): name is string => name != null)
      .some((name) => !isKfpDriverTaskName(name) && matchesComponentTaskName(name, componentId)),
  );
}

/** Build run-level S3 prefixes from KFP executor task names while a run is still active. */
export function buildRunLevelPrefixesFromTaskDetails(
  rootDir: string,
  runId: string,
  taskDetails: ComponentTaskDetail[],
): { prefix: string }[] {
  const prefixes: { prefix: string }[] = [];
  const seen = new Set<string>();

  for (const taskDetail of taskDetails) {
    for (const name of [taskDetail.task_id, taskDetail.display_name]) {
      if (name == null || isKfpDriverTaskName(name)) {
        continue;
      }
      const prefix = `${rootDir}/${runId}/${name}/`;
      if (!seen.has(prefix)) {
        seen.add(prefix);
        prefixes.push({ prefix });
      }
    }
  }

  return prefixes;
}

export function resolveActiveRunLevelPrefix(
  rootDir: string,
  runId: string,
  componentStageMap: ComponentStageMap,
  pipelineRun: PipelineRun,
): string | undefined {
  const taskDetails = pipelineRun.run_details?.task_details ?? [];
  const componentsToFetch = getComponentsToFetch(componentStageMap, pipelineRun, new Set());

  for (const componentId of componentsToFetch) {
    const task = findComponentTaskInRunDetails(taskDetails, componentId);
    const taskName = task?.task_id ?? task?.display_name;
    if (taskName && !isKfpDriverTaskName(taskName)) {
      return `${rootDir}/${runId}/${taskName}`;
    }
  }

  return undefined;
}

export function resolveComponentTaskS3Prefix(
  rootDir: string,
  runId: string,
  componentId: string,
  runLevelPrefixes?: { prefix: string }[],
): string | undefined {
  const baseTaskId = componentIdToTaskId(componentId);
  const defaultPrefix = `${rootDir}/${runId}/${baseTaskId}`;
  if (runLevelPrefixes === undefined) {
    return defaultPrefix;
  }
  if (runLevelPrefixes.length === 0) {
    return undefined;
  }
  return findTrainingTaskPrefix(runLevelPrefixes, baseTaskId) ?? defaultPrefix;
}

export function getComponentsToFetch(
  componentStageMap: ComponentStageMap | undefined,
  pipelineRun: PipelineRun | undefined,
  completedComponentIds: Set<string>,
): string[] {
  if (!componentStageMap || !pipelineRun) {
    return [];
  }

  const taskDetails = pipelineRun.run_details?.task_details ?? [];
  const isRunSucceeded = isRunCompleted(pipelineRun.state);

  return componentStageMap.components
    .filter((component) => {
      if (completedComponentIds.has(component.id)) {
        return false;
      }
      const task = findComponentTaskInRunDetails(taskDetails, component.id);
      if (isRunSucceeded) {
        return true;
      }
      const taskState = normalizePipelineRunState(task?.state);
      return (
        taskState === 'SUCCEEDED' ||
        taskState === 'RUNNING' ||
        taskState === 'FAILED' ||
        taskState === 'CANCELED'
      );
    })
    .map((component) => component.id);
}

const MERGED_FIELD_EXCLUDED = new Set([
  'display_name',
  'name',
  'component_id',
  'id',
  'selected_models',
  'status',
]);

function getSelectedModels(metrics: ComponentStatusStage['metrics']): string[] | undefined {
  const selectedModels = metrics?.selected_models;
  return Array.isArray(selectedModels) && selectedModels.every((model) => typeof model === 'string')
    ? selectedModels
    : undefined;
}

export function getComponentStageStatus(
  status: ComponentStatusStage['status'] | ComponentStageMapStage['status'],
): ComponentStageStatus | 'running' | undefined {
  return typeof status === 'object' ? status.state : normalizeComponentStageStatus(status);
}

export function mergeStageWithStatus(
  stage: ComponentStageMapStage,
  statusStage: ComponentStatusStage,
): ComponentStageMapStage {
  const merged: Record<string, unknown> = {
    ...stage,
    ...statusStage,
    description: stage.description,
  };

  for (const excludedKey of MERGED_FIELD_EXCLUDED) {
    delete merged[excludedKey];
  }

  const result: ComponentStageMapStage = {
    ...merged,
    id: stage.id,
    description: stage.description,
  };
  if (statusStage.status.state !== 'failed') {
    delete result.error;
  }
  if (stage.id === 'model_selection') {
    // Branch topology consumes this selection from the stage map.
    // eslint-disable-next-line camelcase
    result.selected_models = getSelectedModels(statusStage.metrics) ?? stage.selected_models;
  }
  result.status = {
    ...statusStage.status,
    ...(statusStage.status.step && stage.steps?.includes(statusStage.status.step)
      ? { step: statusStage.status.step }
      : { step: undefined }),
  };
  return result;
}

export function mergeStatusIntoStageMap(
  stageMap: ComponentStageMap,
  statusFiles: Map<string, ComponentStatusFile>,
): ComponentStageMap {
  return {
    ...stageMap,
    components: stageMap.components.map((component) => {
      const status = statusFiles.get(component.id);
      if (!status) {
        return component;
      }
      const statusStageMap = new Map(status.stages.map((s) => [s.id, s]));
      const mergedStages: ComponentStageMapStage[] = component.stages.map((stage) => {
        const statusStage = statusStageMap.get(stage.id);
        if (!statusStage) {
          return stage;
        }
        return mergeStageWithStatus(stage, statusStage);
      });

      const merged: ComponentStageMapComponent = {
        ...component,
        stages: mergedStages,
      };
      merged.started_at = status.started_at; // eslint-disable-line camelcase
      if (status.completed_at != null) {
        merged.completed_at = status.completed_at; // eslint-disable-line camelcase
      }
      merged.metadata = status.metadata;
      return merged;
    }),
  };
}

export function isComponentFullyComplete(status: ComponentStatusFile): boolean {
  return (
    status.stages.length > 0 &&
    status.stages.every((s) => getComponentStageStatus(s.status) === 'completed')
  );
}

async function discoverStatusJsonPath(
  namespace: string,
  s3Prefix: string,
  signal: AbortSignal,
): Promise<string | undefined> {
  const result: S3ListObjectsResponse = await getS3Files(
    '',
    { signal },
    { namespace, path: s3Prefix },
  );
  const prefix = result.common_prefixes[0]?.prefix;
  if (!prefix) {
    return undefined;
  }
  return `${prefix}component_status/component_status.json`;
}

async function fetchComponentStatus(
  namespace: string,
  s3Prefix: string,
  signal: AbortSignal,
): Promise<ComponentStatusFile | undefined> {
  const jsonPath = await discoverStatusJsonPath(namespace, s3Prefix, signal);
  if (!jsonPath) {
    return undefined;
  }

  return fetchS3Json(namespace, jsonPath, { signal, schema: ComponentStatusFileSchema });
}

export async function fetchComponentStatusForComponent(
  namespace: string,
  rootDir: string,
  runId: string,
  componentId: string,
  runLevelPrefixes: { prefix: string }[] | undefined,
  signal: AbortSignal,
): Promise<{ componentId: string; data: ComponentStatusFile } | undefined> {
  const s3Prefix = resolveComponentTaskS3Prefix(rootDir, runId, componentId, runLevelPrefixes);
  if (!s3Prefix) {
    return undefined;
  }
  const data = await fetchComponentStatus(namespace, s3Prefix, signal);
  if (!data || data.component_id !== componentId) {
    return undefined;
  }
  return { componentId, data };
}

export type ComponentStatusError = {
  componentId: string;
  message: string;
};

const RUN_PREFIX_DISCOVERY_ERROR_ID = '__run_prefix_discovery__';

type UseComponentStatusesReturn = {
  mergedStageMap?: ComponentStageMap;
  isLoading: boolean;
  errors: ComponentStatusError[];
};

export function useComponentStatuses(
  runId: string | undefined,
  namespace: string | undefined,
  pipelineRun: PipelineRun | undefined,
  componentStageMap: ComponentStageMap | undefined,
  dataUpdatedAt: number,
): UseComponentStatusesReturn {
  const { rootDir } = useAutomlOutputDir(pipelineRun);
  const runIsTerminal = isRunInTerminalState(pipelineRun?.state);
  const shouldMergeStatuses = React.useMemo(() => {
    if (!componentStageMap || !pipelineRun) {
      return false;
    }
    return getComponentsToFetch(componentStageMap, pipelineRun, new Set()).length > 0;
  }, [componentStageMap, pipelineRun]);
  const runLevelPrefix = React.useMemo(() => {
    if (!runId || !componentStageMap || !pipelineRun) {
      return undefined;
    }
    if (runIsTerminal) {
      return `${rootDir}/${runId}`;
    }
    return resolveActiveRunLevelPrefix(rootDir, runId, componentStageMap, pipelineRun);
  }, [runId, componentStageMap, pipelineRun, rootDir, runIsTerminal]);
  const {
    data: runLevelFiles,
    isLoading: isRunLevelPrefixesLoading,
    isError: isRunLevelPrefixesError,
    error: runLevelPrefixesError,
  } = useS3ListFilesQuery(namespace, runLevelPrefix);
  const runLevelPrefixes = React.useMemo(() => {
    if (runIsTerminal) {
      return runLevelFiles?.common_prefixes;
    }
    const taskDetails = pipelineRun?.run_details?.task_details;
    if (!runId || !taskDetails?.length) {
      return undefined;
    }
    return buildRunLevelPrefixesFromTaskDetails(rootDir, runId, taskDetails);
  }, [
    runIsTerminal,
    runLevelFiles?.common_prefixes,
    runId,
    rootDir,
    pipelineRun?.run_details?.task_details,
  ]);
  const completedRef = React.useRef(new Set<string>());
  const statusCacheRef = React.useRef(new Map<string, ComponentStatusFile>());
  const errorsRef = React.useRef(new Map<string, ComponentStatusError>());
  const [statusFiles, setStatusFiles] = React.useState(new Map<string, ComponentStatusFile>());
  const [errors, setErrors] = React.useState<ComponentStatusError[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [statusFetchSettled, setStatusFetchSettled] = React.useState(false);

  React.useEffect(() => {
    completedRef.current.clear();
    statusCacheRef.current.clear();
    errorsRef.current.clear();
    setStatusFiles(new Map());
    setErrors([]);
    setStatusFetchSettled(false);
  }, [runId, namespace]);

  React.useEffect(() => {
    setStatusFetchSettled(false);
  }, [componentStageMap]);

  React.useEffect(() => {
    if (!runId || !namespace || !componentStageMap) {
      setIsLoading(false);
      setStatusFetchSettled(true);
      return;
    }

    let prefixDiscoveryErrorsChanged = false;

    if (runIsTerminal && runLevelPrefix) {
      if (isRunLevelPrefixesLoading) {
        setIsLoading(true);
        return;
      }

      if (isRunLevelPrefixesError) {
        const message =
          runLevelPrefixesError instanceof Error
            ? runLevelPrefixesError.message
            : 'Failed to list run task directories';
        errorsRef.current.set(RUN_PREFIX_DISCOVERY_ERROR_ID, {
          componentId: RUN_PREFIX_DISCOVERY_ERROR_ID,
          message,
        });
        prefixDiscoveryErrorsChanged = true;
      } else if (errorsRef.current.delete(RUN_PREFIX_DISCOVERY_ERROR_ID)) {
        prefixDiscoveryErrorsChanged = true;
      }
    }

    const componentsToFetch = getComponentsToFetch(
      componentStageMap,
      pipelineRun,
      completedRef.current,
    );

    if (componentsToFetch.length === 0) {
      if (prefixDiscoveryErrorsChanged) {
        setErrors(Array.from(errorsRef.current.values()));
      }
      setIsLoading(false);
      setStatusFetchSettled(true);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    if (prefixDiscoveryErrorsChanged) {
      setErrors(Array.from(errorsRef.current.values()));
    }

    Promise.allSettled(
      componentsToFetch.map((componentId) =>
        fetchComponentStatusForComponent(
          namespace,
          rootDir,
          runId,
          componentId,
          runLevelPrefixes,
          controller.signal,
        ),
      ),
    )
      .then((results) => {
        if (controller.signal.aborted) {
          return;
        }

        let changed = false;
        let errorsChanged = false;
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const componentId = componentsToFetch[i];

          if (result.status === 'rejected') {
            const message =
              result.reason instanceof Error ? result.reason.message : String(result.reason);
            // eslint-disable-next-line no-console
            console.warn(
              `[useComponentStatuses] Failed to fetch status for ${componentId}:`,
              message,
            );
            errorsRef.current.set(componentId, { componentId, message });
            errorsChanged = true;
            continue;
          }

          if (!result.value) {
            // Successful discovery with no status yet — clear any stale fetch error.
            if (errorsRef.current.delete(componentId)) {
              errorsChanged = true;
            }
            continue;
          }

          const { componentId: cId, data } = result.value;
          statusCacheRef.current.set(cId, data);
          if (errorsRef.current.delete(cId)) {
            errorsChanged = true;
          }
          changed = true;

          if (isComponentFullyComplete(data)) {
            completedRef.current.add(cId);
          }
        }

        if (changed) {
          setStatusFiles(new Map(statusCacheRef.current));
        }
        if (errorsChanged) {
          setErrors(Array.from(errorsRef.current.values()));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setStatusFetchSettled(true);
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    runId,
    namespace,
    pipelineRun,
    componentStageMap,
    rootDir,
    dataUpdatedAt,
    runLevelPrefixes,
    runIsTerminal,
    runLevelPrefix,
    isRunLevelPrefixesLoading,
    isRunLevelPrefixesError,
    runLevelPrefixesError,
    runLevelFiles,
  ]);

  const mergedStageMap = React.useMemo(() => {
    if (!componentStageMap) {
      return undefined;
    }
    if (statusFiles.size === 0) {
      return componentStageMap;
    }
    return mergeStatusIntoStageMap(componentStageMap, statusFiles);
  }, [componentStageMap, statusFiles]);

  const awaitingRunPrefixDiscovery =
    Boolean(componentStageMap) &&
    runIsTerminal &&
    Boolean(runLevelPrefix) &&
    isRunLevelPrefixesLoading;
  const isLoadingReported =
    isLoading || awaitingRunPrefixDiscovery || (shouldMergeStatuses && !statusFetchSettled);

  return { mergedStageMap, isLoading: isLoadingReported, errors };
}
