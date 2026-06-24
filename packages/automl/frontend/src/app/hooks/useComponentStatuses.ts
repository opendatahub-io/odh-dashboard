import React from 'react';
import { fetchS3Json } from '~/app/hooks/queries';
import { useAutomlOutputDir } from '~/app/hooks/useAutomlOutputDir';
import type {
  ComponentStageMap,
  ComponentStageMapComponent,
  ComponentStageMapStage,
} from '~/app/hooks/useComponentStageMap';
import type { PipelineRun, S3ListObjectsResponse } from '~/app/types';
import { getFiles as getS3Files } from '~/app/api/s3';

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
      const taskId = componentIdToTaskId(component.id);
      const task = taskDetails.find((td) => td.display_name === taskId || td.task_id === taskId);
      if (isRunSucceeded) {
        return true;
      }
      return task?.state === 'SUCCEEDED' || task?.state === 'RUNNING';
    })
    .map((component) => component.id);
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
        return { ...stage, ...statusStage, description: stage.description };
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
  rootDir: string,
  runId: string,
  componentId: string,
  signal: AbortSignal,
): Promise<{ componentId: string; data: ComponentStatusFile } | undefined> {
  const taskId = componentIdToTaskId(componentId);
  const s3Prefix = `${rootDir}/${runId}/${taskId}`;

  const jsonPath = await discoverStatusJsonPath(namespace, s3Prefix, signal);
  if (!jsonPath) {
    return undefined;
  }

  const data = await fetchS3Json<ComponentStatusFile>(namespace, jsonPath, { signal });
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
  const completedRef = React.useRef(new Set<string>());
  const statusCacheRef = React.useRef(new Map<string, ComponentStatusFile>());
  const errorsRef = React.useRef(new Map<string, ComponentStatusError>());
  const [statusFiles, setStatusFiles] = React.useState(new Map<string, ComponentStatusFile>());
  const [errors, setErrors] = React.useState<ComponentStatusError[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    completedRef.current.clear();
    statusCacheRef.current.clear();
    errorsRef.current.clear();
    setStatusFiles(new Map());
    setErrors([]);
  }, [runId]);

  React.useEffect(() => {
    if (!runId || !namespace || !componentStageMap) {
      return;
    }

    const componentsToFetch = getComponentsToFetch(
      componentStageMap,
      pipelineRun,
      completedRef.current,
    );

    if (componentsToFetch.length === 0) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    Promise.allSettled(
      componentsToFetch.map((componentId) =>
        fetchComponentStatus(namespace, rootDir, runId, componentId, controller.signal),
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
        }
      });

    return () => {
      controller.abort();
    };
  }, [runId, namespace, pipelineRun, componentStageMap, rootDir, dataUpdatedAt]);

  const mergedStageMap = React.useMemo(() => {
    if (!componentStageMap) {
      return undefined;
    }
    if (statusFiles.size === 0) {
      return componentStageMap;
    }
    return mergeStatusIntoStageMap(componentStageMap, statusFiles);
  }, [componentStageMap, statusFiles]);

  return { mergedStageMap, isLoading, errors };
}
