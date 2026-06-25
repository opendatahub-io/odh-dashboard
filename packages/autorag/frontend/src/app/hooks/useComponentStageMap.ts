import { useQuery } from '@tanstack/react-query';
import { useS3ListFilesQuery, fetchS3Json } from '~/app/hooks/queries';
import { useAutoragOutputDir } from '~/app/hooks/useAutoragOutputDir';
import type { PipelineRun } from '~/app/types';

/* eslint-disable camelcase */
export type ComponentStageMapStage = {
  id: string;
  description: string;
  steps?: string[];
  status?: string;
  timestamp?: string;
} & Record<string, unknown>;

export type ComponentStageMapComponent = {
  id: string;
  description: string;
  stages: ComponentStageMapStage[];
  started_at?: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
} & Record<string, unknown>;

export type ComponentStageMap = {
  pipeline_id: string;
  description: string;
  components: ComponentStageMapComponent[];
  kfp_run_id: string;
  published_at: string;
} & Record<string, unknown>;
/* eslint-enable camelcase */

type UseComponentStageMapReturn = {
  componentStageMap?: ComponentStageMap;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
};

const TASK_ID = 'publish-component-stage-map';

export function isTaskSucceeded(pipelineRun?: PipelineRun): boolean {
  const task = pipelineRun?.run_details?.task_details?.find(
    (td) => td.display_name === TASK_ID || td.task_id === TASK_ID,
  );
  return task?.state === 'SUCCEEDED';
}

export function useComponentStageMap(
  runId?: string,
  namespace?: string,
  pipelineRun?: PipelineRun,
): UseComponentStageMapReturn {
  const { rootDir } = useAutoragOutputDir(pipelineRun);

  const taskSucceeded = isTaskSucceeded(pipelineRun);

  const s3Prefix = taskSucceeded && runId ? `${rootDir}/${runId}/${TASK_ID}` : undefined;

  const {
    data: s3Files,
    isLoading: isS3Loading,
    isError: isS3Error,
  } = useS3ListFilesQuery(namespace, s3Prefix);

  // Discover the nondeterministic ID directory
  const stageMapJsonPath = (() => {
    const prefixes = s3Files?.common_prefixes ?? [];
    if (prefixes.length === 0) {
      return undefined;
    }
    const prefix = prefixes[0]?.prefix;
    if (!prefix) {
      return undefined;
    }
    return `${prefix}component_stage_map/component_stage_map.json`;
  })();

  const {
    data: componentStageMap,
    isLoading: isJsonLoading,
    isError: isJsonError,
    error: jsonError,
  } = useQuery<ComponentStageMap>({
    queryKey: ['autorag', 'componentStageMap', namespace, stageMapJsonPath],
    queryFn: async ({ signal }) => {
      if (!namespace || !stageMapJsonPath) {
        throw new Error('namespace and path are required');
      }
      return fetchS3Json(namespace, stageMapJsonPath, { signal });
    },
    enabled: Boolean(namespace && stageMapJsonPath),
    retry: false,
  });

  const isLoading = (taskSucceeded && isS3Loading) || isJsonLoading;
  const isError = isS3Error || isJsonError;
  const error = isError
    ? isS3Error
      ? new Error('Failed to list component stage map directory')
      : jsonError instanceof Error
        ? jsonError
        : undefined
    : undefined;

  return { componentStageMap, isLoading, isError, error };
}
