import React from 'react';
import * as z from 'zod';
import { fetchS3Json, useS3ListFilesQuery } from '~/app/hooks/queries';
import { useAutomlOutputDir } from '~/app/hooks/useAutomlOutputDir';
import type {
  ComponentStageMap,
  ComponentStageMapComponent,
  ComponentStageMapStage,
} from '~/app/hooks/useComponentStageMap';
import type { PipelineRun, S3ListObjectsResponse } from '~/app/types';
import { getFiles as getS3Files } from '~/app/api/s3';
import { isAllowedFlattenKey, NESTED_STAGE_FIELD_KEYS } from '~/app/topology/stageMapConstants';
import { findTrainingTaskPrefix, isRunInTerminalState } from '~/app/utilities/utils';

type ComponentTaskDetail = {
  task_id: string;
  display_name?: string;
  state?: string;
  create_time?: string;
  start_time?: string;
  end_time?: string;
};

/* eslint-disable camelcase */
const ComponentStatusStageSchema = z
  .object({
    id: z.string(),
    description: z.string().optional(),
    steps: z.array(z.string()).optional(),
    status: z.string().optional(),
    timestamp: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    metrics: z.record(z.string(), z.unknown()).optional(),
    outputs: z.record(z.string(), z.unknown()).optional(),
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .catchall(z.unknown());

export const ComponentStatusFileSchema = z
  .object({
    component_id: z.string(),
    started_at: z.string().optional(),
    completed_at: z.string().optional(),
    stages: z.array(ComponentStatusStageSchema),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .catchall(z.unknown());

export type ComponentStatusFile = z.infer<typeof ComponentStatusFileSchema>;
export type ComponentStatusStage = z.infer<typeof ComponentStatusStageSchema>;
/* eslint-enable camelcase */

export function componentIdToTaskId(componentId: string): string {
  return componentId.replace(/_/g, '-');
}

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
  const isRunSucceeded = pipelineRun.state === 'SUCCEEDED';

  return componentStageMap.components
    .filter((component) => {
      if (completedComponentIds.has(component.id)) {
        return false;
      }
      const task = findComponentTaskInRunDetails(taskDetails, component.id);
      if (isRunSucceeded) {
        return true;
      }
      return task?.state === 'SUCCEEDED' || task?.state === 'RUNNING';
    })
    .map((component) => component.id);
}

const MERGED_FIELD_EXCLUDED = new Set([
  'display_name',
  'name',
  'component_id',
  'id',
  'steps',
  'selected_models',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

  for (const nestedKey of NESTED_STAGE_FIELD_KEYS) {
    const nested = statusStage[nestedKey];
    if (isPlainObject(nested)) {
      for (const [key, value] of Object.entries(nested)) {
        if (isAllowedFlattenKey(key)) {
          merged[key] = value;
        }
      }
    }
  }

  for (const nestedKey of NESTED_STAGE_FIELD_KEYS) {
    delete merged[nestedKey];
  }

  for (const excludedKey of MERGED_FIELD_EXCLUDED) {
    delete merged[excludedKey];
  }

  const result: ComponentStageMapStage = {
    ...merged,
    id: stage.id,
    description: stage.description,
  };
  if (stage.steps !== undefined) {
    result.steps = stage.steps;
  }
  if (statusStage.selected_models !== undefined) {
    result.selected_models = statusStage.selected_models; // eslint-disable-line camelcase
  }
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
      if (status.started_at != null) {
        merged.started_at = status.started_at; // eslint-disable-line camelcase
      }
      if (status.completed_at != null) {
        merged.completed_at = status.completed_at; // eslint-disable-line camelcase
      }
      if (status.metadata != null) {
        merged.metadata = status.metadata;
      }
      return merged;
    }),
  };
}

export function isComponentFullyComplete(status: ComponentStatusFile): boolean {
  return status.stages.length > 0 && status.stages.every((s) => s.status === 'completed');
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
  const runLevelPrefix =
    runId && runIsTerminal && componentStageMap ? `${rootDir}/${runId}` : undefined;
  const {
    data: runLevelFiles,
    isLoading: isRunLevelPrefixesLoading,
    isError: isRunLevelPrefixesError,
    error: runLevelPrefixesError,
  } = useS3ListFilesQuery(namespace, runLevelPrefix);
  const runLevelPrefixes = runIsTerminal ? runLevelFiles?.common_prefixes : undefined;
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
  }, [runId]);

  React.useEffect(() => {
    setStatusFetchSettled(false);
  }, [componentStageMap]);

  React.useEffect(() => {
    if (!runId || !namespace || !componentStageMap) {
      setIsLoading(false);
      return;
    }

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
        setErrors(Array.from(errorsRef.current.values()));
        setIsLoading(false);
        setStatusFetchSettled(true);
        return;
      }

      if (runLevelFiles && !runLevelFiles.common_prefixes.length) {
        setIsLoading(true);
        return;
      }
    }

    const componentsToFetch = getComponentsToFetch(
      componentStageMap,
      pipelineRun,
      completedRef.current,
    );

    if (componentsToFetch.length === 0) {
      setIsLoading(false);
      setStatusFetchSettled(true);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    if (errorsRef.current.delete(RUN_PREFIX_DISCOVERY_ERROR_ID)) {
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
    (isRunLevelPrefixesLoading ||
      (!isRunLevelPrefixesError && runLevelFiles != null && !runLevelFiles.common_prefixes.length));
  const isLoadingReported =
    isLoading || awaitingRunPrefixDiscovery || (shouldMergeStatuses && !statusFetchSettled);

  return { mergedStageMap, isLoading: isLoadingReported, errors };
}
