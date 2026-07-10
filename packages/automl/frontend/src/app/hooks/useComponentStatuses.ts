import React from 'react';
import { fetchS3Json, useS3ListFilesQuery } from '~/app/hooks/queries';
import { useAutomlOutputDir } from '~/app/hooks/useAutomlOutputDir';
import type {
  ComponentStageMap,
  ComponentStageMapComponent,
  ComponentStageMapStage,
} from '~/app/hooks/useComponentStageMap';
import type { PipelineRun, S3ListObjectsResponse } from '~/app/types';
import { getFiles as getS3Files } from '~/app/api/s3';
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
export type ComponentStatusFile = {
  component_id: string;
  started_at?: string;
  completed_at?: string;
  stages: ComponentStageMapStage[];
  metadata?: Record<string, unknown>;
} & Record<string, unknown>;
/* eslint-enable camelcase */

export function componentIdToTaskId(componentId: string): string {
  return componentId.replace(/_/g, '-');
}

export function matchesComponentTaskName(taskName: string, componentId: string): boolean {
  const baseTaskId = componentIdToTaskId(componentId);
  return taskName === baseTaskId || taskName.startsWith(`${baseTaskId}-`);
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
): string {
  const baseTaskId = componentIdToTaskId(componentId);
  const defaultPrefix = `${rootDir}/${runId}/${baseTaskId}`;
  if (!runLevelPrefixes?.length) {
    return defaultPrefix;
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

const NESTED_STAGE_FIELD_KEYS = ['metadata', 'metrics', 'outputs', 'details'] as const;
const MERGED_FIELD_EXCLUDED = new Set(['display_name', 'name', 'component_id']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function mergeStageWithStatus(
  stage: ComponentStageMapStage,
  statusStage: ComponentStageMapStage,
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
        if (!MERGED_FIELD_EXCLUDED.has(key)) {
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

  return {
    id: stage.id,
    description: stage.description,
    ...merged,
  };
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

  return fetchS3Json<ComponentStatusFile>(namespace, jsonPath, { signal });
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
  const data = await fetchComponentStatus(namespace, s3Prefix, signal);
  if (!data) {
    return undefined;
  }
  return { componentId, data };
}

export type ComponentStatusError = {
  componentId: string;
  message: string;
};

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
  const runLevelPrefix = runId ? `${rootDir}/${runId}` : undefined;
  const { data: runLevelFiles, isLoading: isRunLevelPrefixesLoading } = useS3ListFilesQuery(
    namespace,
    runLevelPrefix,
  );
  const runLevelPrefixes = runLevelFiles?.common_prefixes;
  const runIsTerminal = isRunInTerminalState(pipelineRun?.state);
  const completedRef = React.useRef(new Set<string>());
  const statusCacheRef = React.useRef(new Map<string, ComponentStatusFile>());
  const errorsRef = React.useRef(new Map<string, ComponentStatusError>());
  const [statusFiles, setStatusFiles] = React.useState(new Map<string, ComponentStatusFile>());
  const [errors, setErrors] = React.useState<ComponentStatusError[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [statusFetchSettled, setStatusFetchSettled] = React.useState(false);

  const shouldMergeStatuses = React.useMemo(() => {
    if (!componentStageMap || !pipelineRun) {
      return false;
    }
    return getComponentsToFetch(componentStageMap, pipelineRun, new Set()).length > 0;
  }, [componentStageMap, pipelineRun]);

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

    if (runIsTerminal && runLevelPrefix && isRunLevelPrefixesLoading) {
      setIsLoading(true);
      return;
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
    runIsTerminal && Boolean(runLevelPrefix) && isRunLevelPrefixesLoading;
  const isLoadingReported =
    isLoading || awaitingRunPrefixDiscovery || (shouldMergeStatuses && !statusFetchSettled);

  return { mergedStageMap, isLoading: isLoadingReported, errors };
}
